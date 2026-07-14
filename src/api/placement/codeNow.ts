import { requireSupabase } from '@/lib/supabase'
import { logPlacementAudit } from '@/lib/placementAudit'
import { formatCodeNowTotals, normalizeCodeNowCategory, normalizeCodeNowStatus } from '@/lib/codeNowCategories'
import {
  fetchCodeNowChallengeScores,
  fetchCodeNowStudentProfile,
  CODENOW_NOT_CONFIGURED,
} from '@/lib/codeNowProvider'
import { isCodeNowEnabled } from '@/lib/codeNowConfig'
import type { Database } from '@/types/supabase'

export type CodeNowProfileRow = Database['public']['Tables']['codenow_profiles']['Row']
export type CodeNowChallengeRow = Database['public']['Tables']['codenow_challenge_scores']['Row']

function formatError(err: unknown): Error {
  if (err instanceof Error) return err
  if (err && typeof err === 'object' && 'message' in err) {
    return new Error(String((err as { message: unknown }).message))
  }
  return new Error('Unexpected error')
}

function normalizeHeader(header: string): string {
  return String(header || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

async function syncStudentCodeNowFields(
  studentProfileId: string,
  totals: { percentage: number; grade: string },
  syncedAt: string,
) {
  const client = requireSupabase()
  const { error } = await client
    .from('student_profiles')
    .update({
      codenow_score: totals.percentage,
      codenow_grade: totals.grade,
      last_codenow_at: syncedAt,
    })
    .eq('id', studentProfileId)
  if (error) throw formatError(error)
}

export async function getCodeNowProfile(studentIdOrRollNumber: string) {
  const client = requireSupabase()
  const isUuid = /^[0-9a-f-]{36}$/i.test(studentIdOrRollNumber)
  let query = client.from('codenow_profiles').select('*').eq('is_active', true)
  query = isUuid
    ? query.eq('student_profile_id', studentIdOrRollNumber)
    : query.eq('roll_number', studentIdOrRollNumber.trim().toUpperCase())
  const { data, error } = await query.maybeSingle()
  if (error) throw formatError(error)
  return data
}

export async function listCodeNowChallenges(studentProfileId: string) {
  const client = requireSupabase()
  const { data, error } = await client
    .from('codenow_challenge_scores')
    .select('*')
    .eq('student_profile_id', studentProfileId)
    .eq('is_active', true)
    .order('attempted_at', { ascending: false })
  if (error) throw formatError(error)
  return data ?? []
}

export interface CodeNowListFilters {
  search?: string
  page?: number
  limit?: number
}

export async function listCodeNowProfiles(filters: CodeNowListFilters = {}) {
  const client = requireSupabase()
  const page = Math.max(1, filters.page ?? 1)
  const limit = Math.min(100, Math.max(1, filters.limit ?? 50))
  const from = (page - 1) * limit
  const to = from + limit - 1

  let query = client
    .from('codenow_profiles')
    .select('*', { count: 'exact' })
    .eq('is_active', true)
    .order('percentage', { ascending: false })

  if (filters.search?.trim()) {
    const q = filters.search.trim()
    query = query.or(
      `roll_number.ilike.%${q}%,codenow_username.ilike.%${q}%,email.ilike.%${q}%`,
    )
  }

  const { data, error, count } = await query.range(from, to)
  if (error) throw formatError(error)

  const profiles = data ?? []
  const studentIds = profiles.map((p) => p.student_profile_id)
  let names: Record<string, { full_name: string; branch: string }> = {}
  if (studentIds.length) {
    const { data: students, error: studentError } = await client
      .from('student_profiles')
      .select('id, full_name, branch')
      .in('id', studentIds)
    if (studentError) throw formatError(studentError)
    names = Object.fromEntries(
      (students ?? []).map((s) => [s.id, { full_name: s.full_name, branch: s.branch }]),
    )
  }

  const { data: allProfiles } = await client
    .from('codenow_profiles')
    .select('percentage, total_challenges, solved_challenges')
    .eq('is_active', true)

  const { data: challenges } = await client
    .from('codenow_challenge_scores')
    .select('category, percentage')
    .eq('is_active', true)

  const categoryCounts: Record<string, { count: number; avg: number }> = {}
  for (const row of challenges ?? []) {
    const cur = categoryCounts[row.category] ?? { count: 0, avg: 0 }
    cur.count += 1
    cur.avg += row.percentage
    categoryCounts[row.category] = cur
  }
  const categoryDistribution = Object.entries(categoryCounts).map(([category, v]) => ({
    category,
    count: v.count,
    averagePercentage: Math.round(v.avg / Math.max(1, v.count)),
  }))
  const topCategory =
    categoryDistribution.slice().sort((a, b) => b.count - a.count)[0]?.category ?? null

  const { count: totalStudents } = await client
    .from('student_profiles')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true)

  const profileCount = allProfiles?.length ?? 0
  const averageScore = profileCount
    ? Math.round(allProfiles!.reduce((sum, p) => sum + p.percentage, 0) / profileCount)
    : 0
  const attemptedChallenges = allProfiles?.reduce((sum, p) => sum + (p.total_challenges || 0), 0) ?? 0

  return {
    data: profiles.map((p) => ({
      ...p,
      studentName: names[p.student_profile_id]?.full_name ?? '',
      department: names[p.student_profile_id]?.branch ?? '',
    })),
    pagination: {
      page,
      limit,
      total: count ?? profiles.length,
      pages: Math.max(1, Math.ceil((count ?? profiles.length) / limit)),
    },
    summary: {
      totalProfiles: profileCount,
      averageScore,
      attemptedChallenges,
      topCategory,
      studentsWithoutCodeNow: Math.max(0, (totalStudents ?? 0) - profileCount),
      categoryDistribution,
    },
  }
}

export async function upsertCodeNowProfile(input: {
  studentProfileId: string
  email?: string
  username?: string
  totalScore: number
  maxScore: number
  rank?: number | null
  totalChallenges?: number
  solvedChallenges?: number
  source?: 'manual' | 'bulk_upload' | 'api'
  lastSyncedAt?: string
}) {
  const client = requireSupabase()
  const totals = formatCodeNowTotals({ score: input.totalScore, maxScore: input.maxScore })
  const syncedAt = input.lastSyncedAt || new Date().toISOString()

  const { data: student, error: studentError } = await client
    .from('student_profiles')
    .select('id, roll_number, email')
    .eq('id', input.studentProfileId)
    .eq('is_active', true)
    .single()
  if (studentError) throw formatError(studentError)

  const payload = {
    student_profile_id: student.id,
    roll_number: student.roll_number,
    email: input.email ?? student.email ?? '',
    codenow_username: input.username ?? '',
    total_score: totals.score,
    max_score: totals.max_score,
    percentage: totals.percentage,
    grade: totals.grade,
    rank: input.rank ?? null,
    total_challenges: input.totalChallenges ?? 0,
    solved_challenges: input.solvedChallenges ?? 0,
    last_synced_at: syncedAt,
    source: input.source ?? 'manual',
    is_active: true,
  }

  const existing = await getCodeNowProfile(student.id)
  let row: CodeNowProfileRow
  if (existing) {
    const { data, error } = await client
      .from('codenow_profiles')
      .update(payload)
      .eq('id', existing.id)
      .select()
      .single()
    if (error) throw formatError(error)
    row = data
  } else {
    const { data, error } = await client.from('codenow_profiles').insert(payload).select().single()
    if (error) throw formatError(error)
    row = data
  }

  await syncStudentCodeNowFields(student.id, totals, syncedAt)
  await logPlacementAudit({
    action: 'codenow_profile.saved',
    entityType: 'codenow_profile',
    entityId: row.id,
    description: `Saved CodeNow profile for ${student.roll_number}`,
    metadata: { percentage: totals.percentage, grade: totals.grade },
  })
  return row
}

export async function upsertCodeNowChallenge(input: {
  studentProfileId: string
  rollNumber: string
  challengeId?: string
  challengeName: string
  category: string
  score: number
  maxScore: number
  status?: string
  attemptedAt?: string | null
  source?: 'manual' | 'bulk_upload' | 'api'
  rawReferenceId?: string
}) {
  const client = requireSupabase()
  const category = normalizeCodeNowCategory(input.category)
  if (!category) throw new Error('Invalid CodeNow category')
  const totals = formatCodeNowTotals({ score: input.score, maxScore: input.maxScore })
  const challengeId = (input.challengeId || '').trim()
  const syncedAt = new Date().toISOString()

  const payload = {
    student_profile_id: input.studentProfileId,
    roll_number: input.rollNumber,
    challenge_id: challengeId,
    challenge_name: input.challengeName,
    category,
    score: totals.score,
    max_score: totals.max_score,
    percentage: totals.percentage,
    status: normalizeCodeNowStatus(input.status),
    attempted_at: input.attemptedAt || null,
    source: input.source ?? 'manual',
    raw_reference_id: input.rawReferenceId ?? '',
    synced_at: syncedAt,
    is_active: true,
  }

  if (challengeId) {
    const { data: existing } = await client
      .from('codenow_challenge_scores')
      .select('id')
      .eq('student_profile_id', input.studentProfileId)
      .eq('challenge_id', challengeId)
      .eq('is_active', true)
      .maybeSingle()
    if (existing) {
      const { data, error } = await client
        .from('codenow_challenge_scores')
        .update(payload)
        .eq('id', existing.id)
        .select()
        .single()
      if (error) throw formatError(error)
      return data
    }
  }

  const { data, error } = await client.from('codenow_challenge_scores').insert(payload).select().single()
  if (error) throw formatError(error)
  return data
}

export async function syncCodeNowProfile(studentProfileId: string) {
  if (!isCodeNowEnabled()) {
    throw new Error(CODENOW_NOT_CONFIGURED)
  }
  const client = requireSupabase()
  const { data: student, error } = await client
    .from('student_profiles')
    .select('id, roll_number, email')
    .eq('id', studentProfileId)
    .single()
  if (error) throw formatError(error)

  const existing = await getCodeNowProfile(student.id)
  const lookup = {
    rollNumber: student.roll_number,
    email: student.email,
    codeNowUsername: existing?.codenow_username || undefined,
  }

  const profile = await fetchCodeNowStudentProfile(lookup)
  const challenges = await fetchCodeNowChallengeScores(lookup)

  if (profile.totalScore == null || profile.maxScore == null) {
    throw new Error('CodeNow API returned incomplete profile scores')
  }

  const saved = await upsertCodeNowProfile({
    studentProfileId: student.id,
    email: profile.email || student.email,
    username: profile.username || existing?.codenow_username || '',
    totalScore: profile.totalScore,
    maxScore: profile.maxScore,
    rank: profile.rank,
    totalChallenges: profile.totalChallenges ?? challenges.length,
    solvedChallenges:
      profile.solvedChallenges ?? challenges.filter((c) => c.status === 'solved').length,
    source: 'api',
  })

  for (const challenge of challenges) {
    await upsertCodeNowChallenge({
      studentProfileId: student.id,
      rollNumber: student.roll_number,
      challengeId: challenge.challengeId || undefined,
      challengeName: challenge.challengeName,
      category: challenge.category,
      score: challenge.score,
      maxScore: challenge.maxScore,
      status: challenge.status,
      attemptedAt: challenge.attemptedAt,
      source: 'api',
      rawReferenceId: challenge.rawReferenceId || undefined,
    })
  }

  return { profile: saved, challengesImported: challenges.length }
}

export interface CodeNowImportPreviewRow {
  rowIndex: number
  rollNumber: string
  studentName: string
  department: string
  email: string
  codeNowUsername: string
  challengeId: string
  challengeName: string
  category: string
  score: number | null
  maxScore: number | null
  percentage: number | null
  grade: string | null
  attemptedAt: string | null
  studentProfileId?: string
  issues: string[]
  warnings: string[]
  status: 'will_create' | 'will_update' | 'unmatched' | 'invalid'
}

function mapImportRecord(record: Record<string, string>) {
  const normalized: Record<string, string> = {}
  Object.entries(record).forEach(([key, value]) => {
    normalized[normalizeHeader(key)] = String(value ?? '')
  })
  return {
    rollNumber: String(normalized.rollnumber || normalized.rollno || normalized.roll || '')
      .trim()
      .toUpperCase(),
    studentName: String(
      normalized.nameofthestudent || normalized.studentname || normalized.name || '',
    ).trim(),
    department: String(normalized.dept || normalized.department || normalized.branch || '').trim(),
    email: String(normalized.emailid || normalized.email || '').trim().toLowerCase(),
    codeNowUsername: String(
      normalized.codenowusername || normalized.username || normalized.handle || '',
    ).trim(),
    challengeId: String(normalized.challengeid || normalized.challenge_id || '').trim(),
    challengeName: String(
      normalized.challengename || normalized.challenge || normalized.testname || '',
    ).trim(),
    category: String(normalized.category || normalized.challengecategory || '').trim(),
    scoreRaw: normalized.score || normalized.marks || normalized.codenowscore || '',
    maxRaw: normalized.maxscore || normalized.maximumscore || normalized.outof || normalized.max || '',
    dateRaw: String(normalized.attemptedat || normalized.date || normalized.testdate || '').trim(),
  }
}

export async function previewCodeNowImport(records: Record<string, string>[]) {
  const client = requireSupabase()
  const mapped = records.map((record, index) => ({
    rowIndex: index + 2,
    ...mapImportRecord(record),
  }))

  const rollCounts: Record<string, number> = {}
  for (const row of mapped) {
    if (!row.rollNumber) continue
    rollCounts[row.rollNumber] = (rollCounts[row.rollNumber] || 0) + 1
  }
  const duplicateRollNumbers = Object.keys(rollCounts).filter((r) => rollCounts[r] > 1)

  const matchedRows: CodeNowImportPreviewRow[] = []
  const unmatchedRows: CodeNowImportPreviewRow[] = []
  const invalidRows: CodeNowImportPreviewRow[] = []

  for (const row of mapped) {
    const issues: string[] = []
    const warnings: string[] = []
    if (!row.rollNumber) issues.push('Missing roll number')
    if (row.rollNumber && duplicateRollNumbers.includes(row.rollNumber)) {
      warnings.push('Duplicate roll number in upload (multiple challenges OK)')
    }
    if (!row.challengeName) issues.push('Missing challenge name')

    const category = normalizeCodeNowCategory(row.category || 'other')
    if (!category) issues.push('Invalid category')

    const score = Number(row.scoreRaw)
    const maxScore = Number(row.maxRaw || '100')
    let percentage: number | null = null
    let grade: string | null = null
    if (row.scoreRaw === '' || Number.isNaN(score)) issues.push('Invalid score')
    if (Number.isNaN(maxScore) || maxScore <= 0) issues.push('Invalid max score')
    if (!Number.isNaN(score) && !Number.isNaN(maxScore) && maxScore > 0) {
      if (score < 0 || score > maxScore) issues.push('Score must be between 0 and max score')
      else {
        try {
          const totals = formatCodeNowTotals({ score, maxScore })
          percentage = totals.percentage
          grade = totals.grade
        } catch (err) {
          issues.push(err instanceof Error ? err.message : 'Could not calculate percentage')
        }
      }
    }

    let attemptedAt: string | null = null
    if (row.dateRaw) {
      const parsed = new Date(row.dateRaw)
      if (Number.isNaN(parsed.getTime())) warnings.push('Invalid attempted date')
      else attemptedAt = parsed.toISOString()
    }

    const baseRow: CodeNowImportPreviewRow = {
      rowIndex: row.rowIndex,
      rollNumber: row.rollNumber,
      studentName: row.studentName,
      department: row.department,
      email: row.email,
      codeNowUsername: row.codeNowUsername,
      challengeId: row.challengeId,
      challengeName: row.challengeName,
      category: category || row.category,
      score: Number.isNaN(score) ? null : score,
      maxScore: Number.isNaN(maxScore) ? null : maxScore,
      percentage,
      grade,
      attemptedAt,
      issues,
      warnings,
      status: 'invalid',
    }

    if (!row.rollNumber) {
      unmatchedRows.push({ ...baseRow, status: 'unmatched' })
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
      unmatchedRows.push({ ...baseRow, issues, status: 'unmatched' })
      continue
    }

    const existing = await getCodeNowProfile(student.id)
    const status = issues.length ? 'invalid' : existing ? 'will_update' : 'will_create'
    const packed: CodeNowImportPreviewRow = {
      ...baseRow,
      studentName: row.studentName || student.full_name,
      department: row.department || student.branch,
      email: row.email || student.email,
      studentProfileId: student.id,
      issues,
      status,
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

export async function confirmCodeNowImport(rows: CodeNowImportPreviewRow[]) {
  const result = {
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    challengesSaved: 0,
    errors: [] as Array<{ rollNumber: string; message: string }>,
  }

  const byStudent = new Map<string, CodeNowImportPreviewRow[]>()
  for (const row of rows) {
    if (!row.studentProfileId || row.status === 'unmatched' || row.status === 'invalid') {
      result.skipped += 1
      continue
    }
    const list = byStudent.get(row.studentProfileId) ?? []
    list.push(row)
    byStudent.set(row.studentProfileId, list)
  }

  for (const [studentProfileId, studentRows] of byStudent) {
    try {
      const existing = await getCodeNowProfile(studentProfileId)
      let challengeScoreSum = 0
      let challengeMaxSum = 0
      let solved = 0

      for (const row of studentRows) {
        if (row.score == null || row.maxScore == null) continue
        await upsertCodeNowChallenge({
          studentProfileId,
          rollNumber: row.rollNumber,
          challengeId: row.challengeId || undefined,
          challengeName: row.challengeName,
          category: row.category,
          score: row.score,
          maxScore: row.maxScore,
          status: row.percentage != null && row.percentage >= 60 ? 'solved' : 'attempted',
          attemptedAt: row.attemptedAt,
          source: 'bulk_upload',
        })
        challengeScoreSum += row.score
        challengeMaxSum += row.maxScore
        if ((row.percentage ?? 0) >= 60) solved += 1
        result.challengesSaved += 1
      }

      const allChallenges = await listCodeNowChallenges(studentProfileId)
      const totalScore = allChallenges.reduce((sum, c) => sum + Number(c.score), 0)
      const maxScore = allChallenges.reduce((sum, c) => sum + Number(c.max_score), 0) || challengeMaxSum || 100
      const solvedCount = allChallenges.filter((c) => c.status === 'solved').length || solved
      const username = studentRows.find((r) => r.codeNowUsername)?.codeNowUsername || existing?.codenow_username || ''
      const email = studentRows.find((r) => r.email)?.email || existing?.email || ''

      await upsertCodeNowProfile({
        studentProfileId,
        email,
        username,
        totalScore: challengeMaxSum || maxScore ? totalScore || challengeScoreSum : challengeScoreSum,
        maxScore: maxScore || 100,
        totalChallenges: allChallenges.length || studentRows.length,
        solvedChallenges: solvedCount,
        source: 'bulk_upload',
      })

      if (existing) result.updated += 1
      else result.created += 1
    } catch (err) {
      result.failed += 1
      result.errors.push({
        rollNumber: studentRows[0]?.rollNumber || '',
        message: err instanceof Error ? err.message : 'Import failed',
      })
    }
  }

  await logPlacementAudit({
    action: 'codenow_profile.import_confirmed',
    entityType: 'codenow_profile',
    description: 'CodeNow import confirmed',
    metadata: {
      created: result.created,
      updated: result.updated,
      skipped: result.skipped,
      failed: result.failed,
      challengesSaved: result.challengesSaved,
    },
  })

  return result
}

export function codeNowProfilesToCsv(
  rows: Array<CodeNowProfileRow & { studentName?: string; department?: string }>,
): string {
  const escape = (value: unknown) => {
    const s = String(value ?? '')
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const header = [
    'Roll number',
    'Name',
    'Dept',
    'Email',
    'CodeNow Username',
    'Total score',
    'Max score',
    'Percentage',
    'Grade',
    'Total challenges',
    'Solved challenges',
    'Last synced',
  ]
  const lines = [header.join(',')]
  for (const row of rows) {
    lines.push(
      [
        row.roll_number,
        escape(row.studentName),
        escape(row.department),
        row.email,
        escape(row.codenow_username),
        row.total_score,
        row.max_score,
        row.percentage,
        escape(row.grade),
        row.total_challenges,
        row.solved_challenges,
        row.last_synced_at?.slice(0, 10) ?? '',
      ].join(','),
    )
  }
  return lines.join('\n')
}

export async function exportCodeNowScores(filters: CodeNowListFilters = {}) {
  const { data } = await listCodeNowProfiles({ ...filters, page: 1, limit: 100 })
  const csv = codeNowProfilesToCsv(data)
  await logPlacementAudit({
    action: 'codenow_profile.exported',
    entityType: 'codenow_profile',
    description: 'CodeNow scores exported',
    metadata: { count: data.length },
  })
  return csv
}

export function categorySummaryFromChallenges(
  challenges: CodeNowChallengeRow[],
): Record<string, number> {
  const groups: Record<string, { sum: number; count: number }> = {}
  for (const row of challenges) {
    const g = groups[row.category] ?? { sum: 0, count: 0 }
    g.sum += row.percentage
    g.count += 1
    groups[row.category] = g
  }
  return Object.fromEntries(
    Object.entries(groups).map(([k, v]) => [k, Math.round(v.sum / Math.max(1, v.count))]),
  )
}