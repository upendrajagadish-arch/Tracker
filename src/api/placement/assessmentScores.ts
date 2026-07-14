import { requireSupabase } from '@/lib/supabase'
import { logPlacementAudit } from '@/lib/placementAudit'
import { formatAssessmentTotals } from '@/lib/assessmentScores'
import type { Database } from '@/types/supabase'

export type AptitudeScoreRow = Database['public']['Tables']['aptitude_scores']['Row']
export type VerbalScoreRow = Database['public']['Tables']['verbal_scores']['Row']

type AssessmentKind = 'aptitude' | 'verbal'

function formatError(err: unknown): Error {
  if (err instanceof Error) return err
  if (err && typeof err === 'object' && 'message' in err) {
    return new Error(String((err as { message: unknown }).message))
  }
  return new Error('Unexpected error')
}

async function syncStudentAssessmentProfile(
  kind: AssessmentKind,
  studentProfileId: string,
  totals: { percentage: number; grade: string },
  evaluatedAt: string,
) {
  const client = requireSupabase()
  if (kind === 'aptitude') {
    const { error } = await client
      .from('student_profiles')
      .update({
        aptitude_score: totals.percentage,
        aptitude_grade: totals.grade,
        last_aptitude_at: evaluatedAt,
      })
      .eq('id', studentProfileId)
    if (error) throw formatError(error)
    return
  }
  const { error } = await client
    .from('student_profiles')
    .update({
      verbal_score: totals.percentage,
      verbal_grade: totals.grade,
      last_verbal_at: evaluatedAt,
    })
    .eq('id', studentProfileId)
  if (error) throw formatError(error)
}

export async function getLatestAptitudeScore(studentProfileId: string) {
  const client = requireSupabase()
  const { data, error } = await client
    .from('aptitude_scores')
    .select('*')
    .eq('student_profile_id', studentProfileId)
    .eq('is_active', true)
    .order('evaluated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw formatError(error)
  return data
}

export async function getLatestVerbalScore(studentProfileId: string) {
  const client = requireSupabase()
  const { data, error } = await client
    .from('verbal_scores')
    .select('*')
    .eq('student_profile_id', studentProfileId)
    .eq('is_active', true)
    .order('evaluated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw formatError(error)
  return data
}

async function upsertAssessment(
  kind: AssessmentKind,
  input: {
    studentProfileId: string
    score: number
    maxScore: number
    testName?: string
    evaluatedAt?: string
    source?: 'manual' | 'bulk_upload'
    categoryBreakdown?: Record<string, number>
  },
) {
  const client = requireSupabase()
  const totals = formatAssessmentTotals({ score: input.score, maxScore: input.maxScore })
  const evaluatedAt = input.evaluatedAt || new Date().toISOString()

  const { data: student, error: studentError } = await client
    .from('student_profiles')
    .select('id, roll_number')
    .eq('id', input.studentProfileId)
    .eq('is_active', true)
    .single()
  if (studentError) throw formatError(studentError)

  const latest =
    kind === 'aptitude'
      ? await getLatestAptitudeScore(input.studentProfileId)
      : await getLatestVerbalScore(input.studentProfileId)

  const payload = {
    student_profile_id: student.id,
    roll_number: student.roll_number,
    score: totals.score,
    max_score: totals.max_score,
    percentage: totals.percentage,
    grade: totals.grade,
    source: input.source ?? 'manual',
    test_name: input.testName ?? '',
    evaluated_at: evaluatedAt,
    category_breakdown: input.categoryBreakdown ?? {},
    is_active: true,
  }

  let row: AptitudeScoreRow | VerbalScoreRow
  if (kind === 'aptitude') {
    if (latest) {
      const { data, error } = await client
        .from('aptitude_scores')
        .update(payload)
        .eq('id', latest.id)
        .select()
        .single()
      if (error) throw formatError(error)
      row = data
    } else {
      const { data, error } = await client.from('aptitude_scores').insert(payload).select().single()
      if (error) throw formatError(error)
      row = data
    }
  } else if (latest) {
    const { data, error } = await client
      .from('verbal_scores')
      .update(payload)
      .eq('id', latest.id)
      .select()
      .single()
    if (error) throw formatError(error)
    row = data
  } else {
    const { data, error } = await client.from('verbal_scores').insert(payload).select().single()
    if (error) throw formatError(error)
    row = data
  }

  await syncStudentAssessmentProfile(kind, student.id, totals, evaluatedAt)
  await logPlacementAudit({
    action: `${kind}_score.saved`,
    entityType: `${kind}_score`,
    entityId: row.id,
    description: `Saved ${kind} score for ${student.roll_number}`,
    metadata: { percentage: totals.percentage, grade: totals.grade },
  })

  return row
}

export async function saveAptitudeScore(input: {
  studentProfileId: string
  score: number
  maxScore: number
  testName?: string
  evaluatedAt?: string
  source?: 'manual' | 'bulk_upload'
  categoryBreakdown?: Record<string, number>
}) {
  return upsertAssessment('aptitude', input)
}

export async function saveVerbalScore(input: {
  studentProfileId: string
  score: number
  maxScore: number
  testName?: string
  evaluatedAt?: string
  source?: 'manual' | 'bulk_upload'
  categoryBreakdown?: Record<string, number>
}) {
  return upsertAssessment('verbal', input)
}

export interface AssessmentImportPreviewRow {
  rowIndex: number
  rollNumber: string
  studentName: string
  department: string
  email: string
  studentProfileId?: string
  score: number | null
  maxScore: number | null
  percentage: number | null
  grade: string | null
  testName: string
  evaluatedAt: string
  issues: string[]
  warnings: string[]
  status: 'will_create' | 'will_update' | 'unmatched' | 'invalid'
  existingId?: string | null
}

function normalizeHeader(header: string): string {
  return String(header || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

function mapAssessmentRecord(record: Record<string, string>, kind: AssessmentKind) {
  const normalized: Record<string, string> = {}
  Object.entries(record).forEach(([key, value]) => {
    normalized[normalizeHeader(key)] = String(value ?? '')
  })

  const scoreKey =
    kind === 'aptitude'
      ? normalized.aptitudescore || normalized.score || normalized.marks || ''
      : normalized.verbalscore || normalized.score || normalized.marks || ''
  const maxKey =
    normalized.maxscore || normalized.maximumscore || normalized.outof || normalized.max || ''

  return {
    rollNumber: String(normalized.rollnumber || normalized.rollno || normalized.roll || '')
      .trim()
      .toUpperCase(),
    studentName: String(
      normalized.nameofthestudent || normalized.studentname || normalized.name || '',
    ).trim(),
    department: String(normalized.dept || normalized.department || normalized.branch || '').trim(),
    email: String(normalized.emailid || normalized.email || '').trim().toLowerCase(),
    scoreRaw: scoreKey,
    maxRaw: maxKey || '100',
    testName: String(normalized.testname || normalized.test || normalized.exam || '').trim(),
    dateRaw: String(normalized.date || normalized.evaluatedat || normalized.testdate || '').trim(),
  }
}

async function previewAssessmentUpload(kind: AssessmentKind, records: Record<string, string>[]) {
  const client = requireSupabase()
  const mapped = records.map((record, index) => ({
    rowIndex: index + 2,
    ...mapAssessmentRecord(record, kind),
  }))

  const rollCounts: Record<string, number> = {}
  for (const row of mapped) {
    if (!row.rollNumber) continue
    rollCounts[row.rollNumber] = (rollCounts[row.rollNumber] || 0) + 1
  }
  const duplicateRollNumbers = Object.keys(rollCounts).filter((r) => rollCounts[r] > 1)

  const matchedRows: AssessmentImportPreviewRow[] = []
  const unmatchedRows: AssessmentImportPreviewRow[] = []
  const invalidRows: AssessmentImportPreviewRow[] = []

  for (const row of mapped) {
    const issues: string[] = []
    const warnings: string[] = []
    if (!row.rollNumber) issues.push('Missing roll number')
    if (row.rollNumber && duplicateRollNumbers.includes(row.rollNumber)) {
      issues.push('Duplicate roll number in upload')
    }

    const score = Number(row.scoreRaw)
    const maxScore = Number(row.maxRaw)
    let percentage: number | null = null
    let grade: string | null = null

    if (row.scoreRaw === '' || Number.isNaN(score)) issues.push('Invalid score')
    if (row.maxRaw === '' || Number.isNaN(maxScore) || maxScore <= 0) issues.push('Invalid max score')
    if (!Number.isNaN(score) && !Number.isNaN(maxScore) && maxScore > 0) {
      if (score < 0 || score > maxScore) issues.push('Score must be between 0 and max score')
      else {
        try {
          const totals = formatAssessmentTotals({ score, maxScore })
          percentage = totals.percentage
          grade = totals.grade
        } catch (err) {
          issues.push(err instanceof Error ? err.message : 'Could not calculate percentage')
        }
      }
    }

    let evaluatedAt = new Date().toISOString()
    if (row.dateRaw) {
      const parsed = new Date(row.dateRaw)
      if (Number.isNaN(parsed.getTime())) warnings.push('Invalid date — using today')
      else evaluatedAt = parsed.toISOString()
    }

    if (!row.rollNumber) {
      unmatchedRows.push({
        rowIndex: row.rowIndex,
        rollNumber: '',
        studentName: row.studentName,
        department: row.department,
        email: row.email,
        score: Number.isNaN(score) ? null : score,
        maxScore: Number.isNaN(maxScore) ? null : maxScore,
        percentage,
        grade,
        testName: row.testName,
        evaluatedAt,
        issues,
        warnings,
        status: 'unmatched',
      })
      continue
    }

    const { data: student, error } = await client
      .from('student_profiles')
      .select('id, full_name, email, branch, roll_number')
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
        score: Number.isNaN(score) ? null : score,
        maxScore: Number.isNaN(maxScore) ? null : maxScore,
        percentage,
        grade,
        testName: row.testName,
        evaluatedAt,
        issues,
        warnings,
        status: 'unmatched',
      })
      continue
    }

    const existing =
      kind === 'aptitude'
        ? await getLatestAptitudeScore(student.id)
        : await getLatestVerbalScore(student.id)

    const status = issues.length ? 'invalid' : existing ? 'will_update' : 'will_create'
    const packed: AssessmentImportPreviewRow = {
      rowIndex: row.rowIndex,
      rollNumber: row.rollNumber,
      studentName: row.studentName || student.full_name,
      department: row.department || student.branch,
      email: row.email || student.email,
      studentProfileId: student.id,
      score: Number.isNaN(score) ? null : score,
      maxScore: Number.isNaN(maxScore) ? null : maxScore,
      percentage,
      grade,
      testName: row.testName,
      evaluatedAt,
      issues,
      warnings,
      status,
      existingId: existing?.id ?? null,
    }

    if (issues.length) invalidRows.push(packed)
    else matchedRows.push(packed)
  }

  return {
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
}

async function confirmAssessmentUpload(kind: AssessmentKind, rows: AssessmentImportPreviewRow[]) {
  const result = {
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    errors: [] as Array<{ rollNumber: string; message: string }>,
  }

  for (const row of rows) {
    try {
      if (!row.studentProfileId || row.status === 'unmatched' || row.status === 'invalid') {
        result.skipped += 1
        continue
      }
      if (row.score == null || row.maxScore == null) throw new Error('Missing score')

      await upsertAssessment(kind, {
        studentProfileId: row.studentProfileId,
        score: row.score,
        maxScore: row.maxScore,
        testName: row.testName,
        evaluatedAt: row.evaluatedAt,
        source: 'bulk_upload',
      })

      if (row.existingId) result.updated += 1
      else result.created += 1
    } catch (err) {
      result.failed += 1
      result.errors.push({
        rollNumber: row.rollNumber,
        message: err instanceof Error ? err.message : 'Import failed',
      })
    }
  }

  await logPlacementAudit({
    action: `${kind}_score.import_confirmed`,
    entityType: `${kind}_score`,
    description: `${kind} score import confirmed`,
    metadata: {
      created: result.created,
      updated: result.updated,
      skipped: result.skipped,
      failed: result.failed,
    },
  })

  return result
}

export async function previewAptitudeUpload(records: Record<string, string>[]) {
  return previewAssessmentUpload('aptitude', records)
}

export async function previewVerbalUpload(records: Record<string, string>[]) {
  return previewAssessmentUpload('verbal', records)
}

export async function confirmAptitudeUpload(rows: AssessmentImportPreviewRow[]) {
  return confirmAssessmentUpload('aptitude', rows)
}

export async function confirmVerbalUpload(rows: AssessmentImportPreviewRow[]) {
  return confirmAssessmentUpload('verbal', rows)
}

export async function listAptitudeScores(limit = 100) {
  const client = requireSupabase()
  const { data, error } = await client
    .from('aptitude_scores')
    .select('*')
    .eq('is_active', true)
    .order('evaluated_at', { ascending: false })
    .limit(limit)
  if (error) throw formatError(error)
  return data ?? []
}

export async function listVerbalScores(limit = 100) {
  const client = requireSupabase()
  const { data, error } = await client
    .from('verbal_scores')
    .select('*')
    .eq('is_active', true)
    .order('evaluated_at', { ascending: false })
    .limit(limit)
  if (error) throw formatError(error)
  return data ?? []
}
