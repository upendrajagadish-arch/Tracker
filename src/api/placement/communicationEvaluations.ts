import { requireSupabase } from '@/lib/supabase'
import { logPlacementAudit } from '@/lib/placementAudit'
import { recalculateReadiness } from '@/api/placement/readiness'
import {
  ALL_CRITERIA_KEYS,
  calculateEvaluationTotals,
  clampScore,
  findCriteriaKeyForHeader,
  normalizeHeader,
  type CriteriaKey,
  type EvaluationScoreInput,
} from '@/lib/communicationEvaluation'
import {
  classifyCommunicationBadge,
  communicationBadgePercent,
  isCommunicationBadge,
  badgeStudentsToCsv,
  type CommunicationBadge,
} from '@/lib/communicationBadge'
import type { Database } from '@/types/supabase'

export type CommunicationEvaluationRow = Database['public']['Tables']['communication_evaluations']['Row']

export interface CommunicationListFilters {
  branch?: string
  batch?: string
  graduationYear?: number
  grade?: string
  search?: string
  rollNumber?: string
  page?: number
  limit?: number
  latestOnly?: boolean
}

export interface CommunicationSummary {
  totalEvaluated: number
  averageCommunicationScore: number
  gradeAPlus: number
  needsImprovement: number
}

function normalizePagination(page = 1, limit = 20) {
  const safePage = Math.max(1, page)
  const safeLimit = Math.min(Math.max(1, limit), 100)
  return { page: safePage, limit: safeLimit, from: (safePage - 1) * safeLimit, to: safePage * safeLimit - 1 }
}

function formatError(err: unknown): Error {
  if (err instanceof Error) return err
  if (err && typeof err === 'object' && 'message' in err) {
    return new Error(String((err as { message: unknown }).message))
  }
  return new Error('Unexpected error')
}

function buildSummary(rows: CommunicationEvaluationRow[]): CommunicationSummary {
  const totalEvaluated = rows.length
  const averageCommunicationScore = totalEvaluated
    ? Math.round(rows.reduce((sum, row) => sum + (row.percentage || 0), 0) / totalEvaluated)
    : 0
  return {
    totalEvaluated,
    averageCommunicationScore,
    gradeAPlus: rows.filter((r) => r.grade === 'A+').length,
    needsImprovement: rows.filter((r) => r.grade === 'Needs Improvement').length,
  }
}

async function recalculateBestEffort(
  studentProfileId: string,
  warnings: Array<{ studentProfileId: string; message: string }>,
) {
  try {
    await recalculateReadiness(studentProfileId)
  } catch (err) {
    warnings.push({
      studentProfileId,
      message: err instanceof Error ? err.message : 'Readiness recalculation failed',
    })
  }
}

async function syncStudentProfile(
  studentProfileId: string,
  totals: ReturnType<typeof calculateEvaluationTotals>,
  evaluationDate: string,
) {
  const client = requireSupabase()
  const { error } = await client
    .from('student_profiles')
    .update({
      communication_score: totals.percentage,
      communication_grade: totals.grade,
      last_communication_evaluation_at: evaluationDate,
    })
    .eq('id', studentProfileId)
  if (error) throw formatError(error)
}

export async function listCommunicationEvaluations(filters: CommunicationListFilters = {}) {
  const client = requireSupabase()
  const { page, limit, from, to } = normalizePagination(filters.page, filters.limit)

  let query = client
    .from('communication_evaluations')
    .select('*', { count: 'exact' })
    .eq('is_active', true)
    .order('evaluation_date', { ascending: false })

  if (filters.grade) query = query.eq('grade', filters.grade)
  if (filters.rollNumber) query = query.eq('roll_number', filters.rollNumber.trim().toUpperCase())
  if (filters.search) {
    const q = filters.search.trim()
    query = query.or(`roll_number.ilike.%${q}%,student_name.ilike.%${q}%,email.ilike.%${q}%`)
  }

  const { data, error, count } = await query.range(0, 4999)
  if (error) throw formatError(error)

  let rows = data ?? []

  if (filters.branch || filters.batch || filters.graduationYear != null) {
    const ids = [...new Set(rows.map((r) => r.student_profile_id))]
    let profileQuery = client
      .from('student_profiles')
      .select('id, branch, batch, academic_batch, graduation_year')
      .in('id', ids)
    if (filters.branch) profileQuery = profileQuery.eq('branch', filters.branch)
    if (filters.batch) profileQuery = profileQuery.eq('batch', filters.batch)
    const { data: profiles, error: profileError } = ids.length
      ? await profileQuery
      : {
          data: [] as Array<{
            id: string
            branch: string
            batch: string
            academic_batch: string | null
            graduation_year: number | null
          }>,
          error: null,
        }
    if (profileError) throw formatError(profileError)
    const allowed = new Set(
      (profiles ?? [])
        .filter((profile) => {
          if (filters.graduationYear == null) return true
          const year =
            profile.graduation_year != null
              ? Number(profile.graduation_year)
              : Number(String(profile.academic_batch || profile.batch || '').match(/(\d{4})\s*$/)?.[1] ?? NaN)
          return year === filters.graduationYear
        })
        .map((p) => p.id),
    )
    rows = rows.filter((r) => allowed.has(r.student_profile_id))
  }

  if (filters.latestOnly !== false) {
    const seen = new Set<string>()
    rows = rows.filter((row) => {
      if (seen.has(row.student_profile_id)) return false
      seen.add(row.student_profile_id)
      return true
    })
  }

  const summary = buildSummary(rows)
  const pageRows = rows.slice(from, to + 1)
  const total = rows.length

  return {
    data: pageRows,
    pagination: { page, limit, total, pages: total ? Math.ceil(total / limit) : 0 },
    summary,
    _count: count,
  }
}

export async function getLatestEvaluationForStudent(studentProfileId: string) {
  const client = requireSupabase()
  const { data, error } = await client
    .from('communication_evaluations')
    .select('*')
    .eq('student_profile_id', studentProfileId)
    .eq('is_active', true)
    .order('evaluation_date', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw formatError(error)
  return data
}

/** All active communication evaluations for a student (newest first). Staff profile history. */
export async function listEvaluationsForStudent(studentProfileId: string) {
  const client = requireSupabase()
  const { data, error } = await client
    .from('communication_evaluations')
    .select('*')
    .eq('student_profile_id', studentProfileId)
    .eq('is_active', true)
    .order('evaluation_date', { ascending: false })
  if (error) throw formatError(error)
  return (data ?? []) as CommunicationEvaluationRow[]
}

export async function getLatestEvaluationByRollNumber(rollNumber: string) {
  const client = requireSupabase()
  const { data, error } = await client
    .from('communication_evaluations')
    .select('*')
    .eq('roll_number', rollNumber.trim().toUpperCase())
    .eq('is_active', true)
    .order('evaluation_date', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw formatError(error)
  return data
}

export async function getEvaluationById(id: string) {
  const client = requireSupabase()
  const { data, error } = await client
    .from('communication_evaluations')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw formatError(error)
  return data
}

export async function createCommunicationEvaluation(input: {
  studentProfileId: string
  scores: EvaluationScoreInput
  notes?: string
  source?: 'manual' | 'bulk_upload'
  evaluatorId?: string | null
  evaluatorName?: string
  evaluatorRole?: string
}) {
  const client = requireSupabase()
  const { data: student, error: studentError } = await client
    .from('student_profiles')
    .select('*')
    .eq('id', input.studentProfileId)
    .eq('is_active', true)
    .single()
  if (studentError) throw formatError(studentError)

  const totals = calculateEvaluationTotals(input.scores)
  const evaluationDate = new Date().toISOString()
  const warnings: Array<{ studentProfileId: string; message: string }> = []

  const { data, error } = await client
    .from('communication_evaluations')
    .insert({
      student_profile_id: student.id,
      user_id: student.user_id,
      roll_number: student.roll_number,
      student_name: student.full_name,
      department: student.branch || '',
      email: student.email || '',
      ...totals,
      evaluator_id: input.evaluatorId ?? null,
      evaluator_name: input.evaluatorName ?? '',
      evaluator_role: input.evaluatorRole ?? '',
      evaluation_date: evaluationDate,
      source: input.source ?? 'manual',
      notes: input.notes ?? '',
      is_active: true,
    })
    .select()
    .single()
  if (error) throw formatError(error)

  await syncStudentProfile(student.id, totals, evaluationDate)
  await recalculateBestEffort(student.id, warnings)

  await logPlacementAudit({
    action: 'communication_evaluation.created',
    entityType: 'communication_evaluation',
    entityId: data.id,
    description: `Created communication evaluation for ${student.roll_number}`,
    metadata: { totalScore: totals.total_score, grade: totals.grade },
  })

  return { evaluation: data, warnings }
}

export async function updateCommunicationEvaluation(
  id: string,
  input: {
    scores: EvaluationScoreInput
    notes?: string
    evaluatorId?: string | null
    evaluatorName?: string
    evaluatorRole?: string
    source?: 'manual' | 'bulk_upload'
  },
) {
  const client = requireSupabase()
  const existing = await getEvaluationById(id)
  if (!existing) throw new Error('Evaluation not found')

  const totals = calculateEvaluationTotals(input.scores)
  const evaluationDate = new Date().toISOString()
  const warnings: Array<{ studentProfileId: string; message: string }> = []

  const { data, error } = await client
    .from('communication_evaluations')
    .update({
      ...totals,
      notes: input.notes ?? existing.notes,
      evaluator_id: input.evaluatorId ?? existing.evaluator_id,
      evaluator_name: input.evaluatorName ?? existing.evaluator_name,
      evaluator_role: input.evaluatorRole ?? existing.evaluator_role,
      evaluation_date: evaluationDate,
      source: input.source ?? existing.source,
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw formatError(error)

  await syncStudentProfile(existing.student_profile_id, totals, evaluationDate)
  await recalculateBestEffort(existing.student_profile_id, warnings)

  await logPlacementAudit({
    action: 'communication_evaluation.updated',
    entityType: 'communication_evaluation',
    entityId: data.id,
    description: `Updated communication evaluation for ${existing.roll_number}`,
    metadata: { totalScore: totals.total_score, grade: totals.grade },
  })

  return { evaluation: data, warnings }
}

export async function saveStudentCommunicationEvaluation(
  studentProfileId: string,
  input: {
    scores: EvaluationScoreInput
    notes?: string
    evaluatorId?: string | null
    evaluatorName?: string
    evaluatorRole?: string
  },
) {
  const latest = await getLatestEvaluationForStudent(studentProfileId)
  if (latest) {
    return updateCommunicationEvaluation(latest.id, input)
  }
  return createCommunicationEvaluation({
    studentProfileId,
    ...input,
  })
}

export interface CommunicationImportPreviewRow {
  rowIndex: number
  rollNumber: string
  studentName: string
  department: string
  email: string
  studentProfileId?: string
  userId?: string | null
  scores: Record<CriteriaKey, number | null>
  totals: ReturnType<typeof calculateEvaluationTotals> | null
  issues: string[]
  warnings: string[]
  status: 'will_create' | 'will_update' | 'unmatched' | 'invalid'
  existingEvaluationId?: string | null
}

function mapRecordScores(record: Record<string, string>) {
  const normalized: Record<string, string> = {}
  Object.entries(record).forEach(([key, value]) => {
    normalized[normalizeHeader(key)] = String(value ?? '')
  })

  const scores: Partial<Record<CriteriaKey, string>> = {}
  for (const [header, value] of Object.entries(normalized)) {
    const key = findCriteriaKeyForHeader(header)
    if (key) scores[key] = value
  }

  return {
    normalized,
    scores,
    rollNumber: String(normalized.rollnumber || normalized.rollno || normalized.roll || '')
      .trim()
      .toUpperCase(),
    studentName: String(
      normalized.nameofthestudent || normalized.studentname || normalized.name || '',
    ).trim(),
    department: String(normalized.dept || normalized.department || normalized.branch || '').trim(),
    email: String(normalized.emailid || normalized.email || '').trim().toLowerCase(),
    uploadedTotal:
      normalized.totalscore250m ||
      normalized.totalscore ||
      normalized.total ||
      normalized.totalmarks ||
      '',
    uploadedGrade: normalized.grade || '',
  }
}

export async function previewCommunicationUpload(records: Record<string, string>[]) {
  const client = requireSupabase()
  const mapped = records.map((record, index) => ({
    rowIndex: index + 2,
    ...mapRecordScores(record),
  }))

  const rollCounts: Record<string, number> = {}
  for (const row of mapped) {
    if (!row.rollNumber) continue
    rollCounts[row.rollNumber] = (rollCounts[row.rollNumber] || 0) + 1
  }
  const duplicateRollNumbers = Object.keys(rollCounts).filter((r) => rollCounts[r] > 1)

  const matchedRows: CommunicationImportPreviewRow[] = []
  const unmatchedRows: CommunicationImportPreviewRow[] = []
  const invalidRows: CommunicationImportPreviewRow[] = []

  for (const row of mapped) {
    const issues: string[] = []
    const warnings: string[] = []
    const scoreMap = {} as Record<CriteriaKey, number | null>

    if (!row.rollNumber) issues.push('Missing roll number')
    if (row.rollNumber && duplicateRollNumbers.includes(row.rollNumber)) {
      issues.push('Duplicate roll number in upload')
    }

    for (const key of ALL_CRITERIA_KEYS) {
      const raw = row.scores[key]
      if (raw === undefined || raw === '') {
        issues.push(`Missing score: ${key}`)
        scoreMap[key] = null
        continue
      }
      const clamped = clampScore(raw)
      scoreMap[key] = clamped
      if (clamped === null) issues.push(`Invalid score for ${key} (must be 0–10)`)
    }

    let totals: ReturnType<typeof calculateEvaluationTotals> | null = null
    const missingOrInvalid = issues.some(
      (i) => i.startsWith('Missing score') || i.startsWith('Invalid score'),
    )
    if (!missingOrInvalid) {
      try {
        totals = calculateEvaluationTotals(scoreMap as EvaluationScoreInput)
      } catch (err) {
        issues.push(err instanceof Error ? err.message : 'Could not calculate totals')
      }
    }

    if (totals && row.uploadedTotal !== '') {
      const uploaded = Number(row.uploadedTotal)
      if (!Number.isNaN(uploaded) && uploaded !== totals.total_score) {
        warnings.push(
          `Uploaded TOTAL (${uploaded}) differs from calculated total (${totals.total_score})`,
        )
      }
    }
    if (totals && row.uploadedGrade) {
      if (row.uploadedGrade.trim().toLowerCase() !== totals.grade.toLowerCase()) {
        warnings.push(
          `Uploaded GRADE (${row.uploadedGrade}) differs from calculated grade (${totals.grade})`,
        )
      }
    }

    if (!row.rollNumber) {
      unmatchedRows.push({
        rowIndex: row.rowIndex,
        rollNumber: '',
        studentName: row.studentName,
        department: row.department,
        email: row.email,
        scores: scoreMap,
        totals,
        issues,
        warnings,
        status: 'unmatched',
      })
      continue
    }

    const { data: student, error } = await client
      .from('student_profiles')
      .select('id, user_id, full_name, email, branch, roll_number')
      .eq('roll_number', row.rollNumber)
      .eq('is_active', true)
      .maybeSingle()
    if (error) throw formatError(error)

    if (!student) {
      issues.push('Roll number not found — student will not be created')
      unmatchedRows.push({
        rowIndex: row.rowIndex,
        rollNumber: row.rollNumber,
        studentName: row.studentName,
        department: row.department,
        email: row.email,
        scores: scoreMap,
        totals,
        issues,
        warnings,
        status: 'unmatched',
      })
      continue
    }

    const existing = await getLatestEvaluationForStudent(student.id)
    const status = issues.length ? 'invalid' : existing ? 'will_update' : 'will_create'
    const packed: CommunicationImportPreviewRow = {
      rowIndex: row.rowIndex,
      rollNumber: row.rollNumber,
      studentName: row.studentName || student.full_name,
      department: row.department || student.branch,
      email: row.email || student.email,
      studentProfileId: student.id,
      userId: student.user_id,
      scores: scoreMap,
      totals,
      issues,
      warnings,
      status,
      existingEvaluationId: existing?.id ?? null,
    }

    if (issues.length) invalidRows.push(packed)
    else matchedRows.push(packed)
  }

  const preview = {
    matchedRows,
    unmatchedRows,
    invalidRows,
    duplicateRollNumbers,
    summary: {
      total: mapped.length,
      matched: matchedRows.length,
      unmatched: unmatchedRows.length,
      invalid: invalidRows.length,
      duplicates: duplicateRollNumbers.length,
      willCreate: matchedRows.filter((r) => r.status === 'will_create').length,
      willUpdate: matchedRows.filter((r) => r.status === 'will_update').length,
    },
  }

  await logPlacementAudit({
    action: 'communication_evaluation.import_preview',
    entityType: 'communication_evaluation',
    description: 'Communication evaluation import preview',
    metadata: preview.summary,
  })

  return preview
}

export async function confirmCommunicationUpload(
  rows: CommunicationImportPreviewRow[],
  actor?: { id?: string | null; name?: string; role?: string },
) {
  const result = {
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    errors: [] as Array<{ rollNumber: string; message: string }>,
    warnings: [] as Array<{ studentProfileId: string; message: string }>,
  }

  for (const row of rows) {
    try {
      if (!row.studentProfileId || row.status === 'unmatched' || row.status === 'invalid') {
        result.skipped += 1
        continue
      }
      const scoreInput = {} as EvaluationScoreInput
      for (const key of ALL_CRITERIA_KEYS) {
        const value = clampScore(row.scores[key])
        if (value === null) throw new Error(`Invalid score for ${key}`)
        scoreInput[key] = value
      }

      if (row.existingEvaluationId) {
        await updateCommunicationEvaluation(row.existingEvaluationId, {
          scores: scoreInput,
          evaluatorId: actor?.id,
          evaluatorName: actor?.name,
          evaluatorRole: actor?.role,
          source: 'bulk_upload',
        })
        result.updated += 1
      } else {
        await createCommunicationEvaluation({
          studentProfileId: row.studentProfileId,
          scores: scoreInput,
          source: 'bulk_upload',
          evaluatorId: actor?.id,
          evaluatorName: actor?.name,
          evaluatorRole: actor?.role,
        })
        result.created += 1
      }
    } catch (err) {
      result.failed += 1
      result.errors.push({
        rollNumber: row.rollNumber,
        message: err instanceof Error ? err.message : 'Import failed',
      })
    }
  }

  await logPlacementAudit({
    action: 'communication_evaluation.import_confirmed',
    entityType: 'communication_evaluation',
    description: 'Communication evaluation import confirmed',
    metadata: {
      created: result.created,
      updated: result.updated,
      skipped: result.skipped,
      failed: result.failed,
      warningCount: result.warnings.length,
    },
  })

  return result
}

export function evaluationsToCsv(rows: CommunicationEvaluationRow[]): string {
  const escape = (value: unknown) => {
    const s = String(value ?? '')
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }

  const header = [
    'Roll number',
    'Name',
    'Dept',
    'Email',
    ...ALL_CRITERIA_KEYS,
    'Communication Proficiency Total',
    'Presentation Skills Total',
    'Behavioural Skills Total',
    'Total Score 250M',
    'Percentage',
    'Grade',
    'Evaluation Date',
  ]

  const lines = [header.join(',')]
  for (const row of rows) {
    lines.push(
      [
        row.roll_number,
        escape(row.student_name),
        escape(row.department),
        row.email,
        ...ALL_CRITERIA_KEYS.map((key) => row[key]),
        row.communication_proficiency_total,
        row.presentation_skills_total,
        row.behavioural_skills_total,
        row.total_score,
        row.percentage,
        escape(row.grade),
        row.evaluation_date?.slice(0, 10) ?? '',
      ].join(','),
    )
  }
  return lines.join('\n')
}

export async function exportCommunicationEvaluations(filters: CommunicationListFilters = {}) {
  const { data } = await listCommunicationEvaluations({
    ...filters,
    page: 1,
    limit: 5000,
    latestOnly: true,
  })
  await logPlacementAudit({
    action: 'communication_evaluation.exported',
    entityType: 'communication_evaluation',
    description: 'Communication evaluations exported',
    metadata: { count: data.length },
  })
  return evaluationsToCsv(data)
}

export interface CommunicationDashboardFilters {
  academicBatch?: string
  branch?: string
  search?: string
  graduationYear?: number
}

export interface CommunicationDashboardSummary {
  goldCount: number
  silverCount: number
  bronzeCount: number
  poorCount: number
  filteredTotal: number
  goldPercent: number
  silverPercent: number
  bronzePercent: number
  poorPercent: number
}

export interface CommunicationBadgeStudentRow {
  studentProfileId: string
  rollNumber: string
  fullName: string
  branch: string
  academicBatch: string
  totalScore: number
  percentage: number
  grade: string
  badge: CommunicationBadge
}

type ProfileJoin = {
  id: string
  branch: string
  batch: string
  academic_batch: string | null
  graduation_year: number | null
  full_name: string
  roll_number: string
}

async function loadLatestEvaluatedStudents(filters: CommunicationDashboardFilters = {}) {
  const client = requireSupabase()
  const { data, error } = await client
    .from('communication_evaluations')
    .select('id, student_profile_id, roll_number, student_name, department, total_score, percentage, grade, evaluation_date')
    .eq('is_active', true)
    .order('evaluation_date', { ascending: false })
    .range(0, 4999)
  if (error) throw formatError(error)

  const latest: typeof data = []
  const seen = new Set<string>()
  for (const row of data ?? []) {
    if (seen.has(row.student_profile_id)) continue
    seen.add(row.student_profile_id)
    latest.push(row)
  }

  const ids = latest.map((r) => r.student_profile_id)
  const profiles = new Map<string, ProfileJoin>()
  if (ids.length) {
    for (let i = 0; i < ids.length; i += 200) {
      const chunk = ids.slice(i, i + 200)
      const { data: rows, error: pErr } = await client
        .from('student_profiles')
        .select('id, branch, batch, academic_batch, graduation_year, full_name, roll_number')
        .in('id', chunk)
        .eq('is_active', true)
      if (pErr) throw formatError(pErr)
      for (const row of rows ?? []) profiles.set(row.id, row)
    }
  }

  const academicBatch = filters.academicBatch?.trim() || ''
  const branch = filters.branch?.trim() || ''
  const search = filters.search?.trim().toLowerCase() || ''
  const graduationYear = filters.graduationYear

  const rows: CommunicationBadgeStudentRow[] = []
  for (const evalRow of latest) {
    const profile = profiles.get(evalRow.student_profile_id)
    if (!profile) continue

    const displayBatch = (profile.academic_batch || profile.batch || '').trim()
    const displayBranch = (profile.branch || evalRow.department || '').trim()
    const roll = (profile.roll_number || evalRow.roll_number || '').trim()
    const name = (profile.full_name || evalRow.student_name || '').trim()

    if (graduationYear != null) {
      const year =
        profile.graduation_year != null
          ? Number(profile.graduation_year)
          : Number(displayBatch.match(/(\d{4})\s*$/)?.[1] ?? NaN)
      if (year !== graduationYear) continue
    }
    if (academicBatch && displayBatch !== academicBatch && !displayBatch.includes(academicBatch)) continue
    if (branch && displayBranch !== branch) continue
    if (search) {
      const hay = `${roll} ${name}`.toLowerCase()
      if (!hay.includes(search)) continue
    }

    const badge = classifyCommunicationBadge(evalRow.total_score)
    if (!badge) continue

    rows.push({
      studentProfileId: evalRow.student_profile_id,
      rollNumber: roll,
      fullName: name,
      branch: displayBranch,
      academicBatch: displayBatch,
      totalScore: evalRow.total_score,
      percentage: evalRow.percentage,
      grade: evalRow.grade,
      badge,
    })
  }

  return rows
}

export async function getCommunicationDashboard(
  filters: CommunicationDashboardFilters = {},
  options: { audit?: boolean } = {},
): Promise<CommunicationDashboardSummary> {
  const rows = await loadLatestEvaluatedStudents(filters)
  const goldCount = rows.filter((r) => r.badge === 'gold').length
  const silverCount = rows.filter((r) => r.badge === 'silver').length
  const bronzeCount = rows.filter((r) => r.badge === 'bronze').length
  const poorCount = rows.filter((r) => r.badge === 'poor').length
  const filteredTotal = rows.length

  if (options.audit !== false) {
    await logPlacementAudit({
      action: 'COMMUNICATION_DASHBOARD_VIEWED',
      entityType: 'communication_dashboard',
      description: 'Communication dashboard viewed',
      metadata: { ...filters, filteredTotal, goldCount, silverCount, bronzeCount, poorCount },
    })
  }

  return {
    goldCount,
    silverCount,
    bronzeCount,
    poorCount,
    filteredTotal,
    goldPercent: communicationBadgePercent(goldCount, filteredTotal),
    silverPercent: communicationBadgePercent(silverCount, filteredTotal),
    bronzePercent: communicationBadgePercent(bronzeCount, filteredTotal),
    poorPercent: communicationBadgePercent(poorCount, filteredTotal),
  }
}

export async function listCommunicationBadgeStudents(
  badge: string,
  filters: CommunicationDashboardFilters & { page?: number; limit?: number } = {},
) {
  if (!isCommunicationBadge(badge)) {
    throw new Error('Invalid badge. Use gold, silver, bronze, or poor.')
  }

  const { page, limit, from, to } = normalizePagination(filters.page, filters.limit)
  const all = await loadLatestEvaluatedStudents(filters)
  const filtered = all.filter((r) => r.badge === badge)
  const data = filtered.slice(from, to + 1)

  await logPlacementAudit({
    action: 'COMMUNICATION_BADGE_LIST_VIEWED',
    entityType: 'communication_badge',
    entityId: badge,
    description: `Communication ${badge} list viewed`,
    metadata: { ...filters, total: filtered.length, page, limit },
  })

  return {
    data,
    pagination: {
      page,
      limit,
      total: filtered.length,
      pages: filtered.length ? Math.ceil(filtered.length / limit) : 0,
    },
  }
}

export async function exportCommunicationBadgeStudents(
  badge: string,
  filters: CommunicationDashboardFilters = {},
) {
  if (!isCommunicationBadge(badge)) {
    throw new Error('Invalid badge. Use gold, silver, bronze, or poor.')
  }
  const all = await loadLatestEvaluatedStudents(filters)
  const data = all.filter((r) => r.badge === badge)
  await logPlacementAudit({
    action: 'COMMUNICATION_BADGE_EXPORT',
    entityType: 'communication_badge',
    entityId: badge,
    description: `Communication ${badge} list exported`,
    metadata: { ...filters, count: data.length },
  })
  return badgeStudentsToCsv(data)
}

export async function exportCommunicationDashboardStudents(
  filters: CommunicationDashboardFilters = {},
) {
  const data = await loadLatestEvaluatedStudents(filters)
  await logPlacementAudit({
    action: 'COMMUNICATION_BADGE_EXPORT',
    entityType: 'communication_dashboard',
    description: 'Communication dashboard filtered list exported',
    metadata: { ...filters, count: data.length },
  })
  return badgeStudentsToCsv(data)
}

export { badgeStudentsToCsv }

