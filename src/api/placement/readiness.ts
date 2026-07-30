import { requireSupabase } from '@/lib/supabase'
import { logPlacementAudit } from '@/lib/placementAudit'
import { calculateReadiness } from '@/lib/placementReadiness'
import type { Database, Json } from '@/types/supabase'

export type ReadinessSnapshotRow = Database['public']['Tables']['readiness_snapshots']['Row']

export interface ReadinessListFilters {
  studentProfileId?: string
  readinessStatus?: string
  riskLevel?: string
  branch?: string
  batch?: string
  page?: number
  limit?: number
}

export interface PaginatedReadiness {
  data: ReadinessSnapshotRow[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

function normalizePagination(page = 1, limit = 20) {
  const safePage = Math.max(1, page)
  const safeLimit = Math.min(Math.max(1, limit), 100)
  return { page: safePage, limit: safeLimit, from: (safePage - 1) * safeLimit, to: safePage * safeLimit - 1 }
}

export async function listReadiness(filters: ReadinessListFilters = {}): Promise<PaginatedReadiness> {
  const client = requireSupabase()
  const { page, limit, from, to } = normalizePagination(filters.page, filters.limit)

  let query = client
    .from('readiness_snapshots')
    .select('*', { count: 'exact' })
    .order('calculated_at', { ascending: false })

  if (filters.studentProfileId) query = query.eq('student_profile_id', filters.studentProfileId)
  if (filters.readinessStatus) query = query.eq('readiness_status', filters.readinessStatus)
  if (filters.riskLevel) query = query.eq('risk_level', filters.riskLevel)

  const { data, error, count } = await query.range(from, to)
  if (error) throw error

  let rows = data ?? []
  if (filters.branch || filters.batch) {
    const profileIds = [...new Set(rows.map((row) => row.student_profile_id))]
    let profileQuery = client.from('student_profiles').select('id, branch, batch').in('id', profileIds)
    if (filters.branch) profileQuery = profileQuery.eq('branch', filters.branch)
    if (filters.batch) profileQuery = profileQuery.eq('batch', filters.batch)
    const { data: profiles, error: profileError } = profileIds.length
      ? await profileQuery
      : { data: [], error: null }
    if (profileError) throw profileError
    const allowed = new Set((profiles ?? []).map((profile) => profile.id))
    rows = rows.filter((row) => allowed.has(row.student_profile_id))
  }

  const total = filters.branch || filters.batch ? rows.length : (count ?? 0)
  return {
    data: rows,
    pagination: { page, limit, total, pages: total ? Math.ceil(total / limit) : 0 },
  }
}

export async function recalculateReadiness(studentProfileId: string): Promise<ReadinessSnapshotRow> {
  const client = requireSupabase()

  const [
    studentRes,
    resumeRes,
    techSkillsRes,
    codingSnapRes,
  ] = await Promise.all([
    client.from('student_profiles').select('*').eq('id', studentProfileId).single(),
    client
      .from('student_resumes')
      .select('*')
      .eq('student_profile_id', studentProfileId)
      .eq('is_active', true)
      .maybeSingle(),
    client.from('student_tech_skills').select('*').eq('student_profile_id', studentProfileId),
    client
      .from('student_coding_snapshots')
      .select('total_solved')
      .eq('student_profile_id', studentProfileId)
      .maybeSingle(),
  ])

  if (studentRes.error) throw studentRes.error
  if (resumeRes.error) throw resumeRes.error
  if (techSkillsRes.error) throw techSkillsRes.error
  // Coding snapshot is optional — ignore missing-table / no-row errors.
  const totalSolved =
    codingSnapRes.error || codingSnapRes.data == null
      ? null
      : Number(codingSnapRes.data.total_solved ?? 0)

  const student = studentRes.data
  const { data: interviews, error: interviewError } = await client
    .from('placement_interviews')
    .select('*')
    .eq('roll_number', student.roll_number)
    .order('created_at', { ascending: false })
    .limit(10)
  if (interviewError) throw interviewError

  const result = calculateReadiness({
    student,
    activeResume: resumeRes.data,
    techSkills: techSkillsRes.data ?? [],
    interviews: interviews ?? [],
    totalSolved,
  })

  const { data: snapshot, error: snapshotError } = await client
    .from('readiness_snapshots')
    .insert({
      student_profile_id: studentProfileId,
      overall_score: result.overallScore,
      technical_score: result.technicalScore,
      communication_score: result.communicationScore,
      resume_score: result.resumeScore,
      tech_stack_score: result.techStackScore,
      profile_score: result.profileScore,
      academic_score: result.academicScore,
      risk_level: result.riskLevel,
      readiness_status: result.readinessStatus,
      score_breakdown: result.scoreBreakdown as Json,
    })
    .select()
    .single()
  if (snapshotError) throw snapshotError

  const { error: updateError } = await client
    .from('student_profiles')
    .update({
      readiness_score: result.overallScore,
      readiness_status: result.readinessStatus,
      risk_level: result.riskLevel,
      profile_completeness: result.profileCompleteness,
    })
    .eq('id', studentProfileId)
  if (updateError) throw updateError

  await logPlacementAudit({
    action: 'readiness.recalculate',
    entityType: 'readiness_snapshot',
    entityId: snapshot.id,
    description: `Recalculated readiness for ${student.roll_number}`,
    metadata: { overallScore: result.overallScore, readinessStatus: result.readinessStatus },
  })

  return snapshot
}

/** Fire-and-forget readiness refresh (staff or public RPC). Never throws. */
export async function refreshReadinessQuiet(studentProfileId: string): Promise<void> {
  await refreshReadinessResult(studentProfileId)
}

export type ReadinessRefreshResult = {
  studentId: string
  readinessScore: number
  readinessStatus: string
  profileCompleteness: number
  riskLevel?: string
}

/** Refresh one student and return the new scores. Never throws. */
export async function refreshReadinessResult(
  studentProfileId: string,
): Promise<ReadinessRefreshResult | null> {
  if (!studentProfileId) return null
  try {
    const client = requireSupabase()
    const { data, error: rpcError } = await client.rpc('refresh_student_readiness', {
      p_student_id: studentProfileId,
    })
    if (!rpcError && data && typeof data === 'object' && !Array.isArray(data)) {
      const payload = data as Record<string, unknown>
      if (payload.ok === false) return null
      return {
        studentId: studentProfileId,
        readinessScore: Math.round(Number(payload.overallScore ?? 0)),
        readinessStatus: String(payload.readinessStatus ?? 'not_ready'),
        profileCompleteness: Math.round(Number(payload.profileCompleteness ?? 0)),
      }
    }
    // Fallback to TS calculator when SQL helper is not applied yet.
    const snapshot = await recalculateReadiness(studentProfileId)
    return {
      studentId: studentProfileId,
      readinessScore: Math.round(Number(snapshot.overall_score ?? 0)),
      readinessStatus: String(snapshot.readiness_status ?? 'not_ready'),
      profileCompleteness: Math.round(Number(snapshot.profile_score ?? 0)),
      riskLevel: snapshot.risk_level,
    }
  } catch {
    return null
  }
}

/**
 * Automatically refresh readiness for students that still show 0 / stale scores.
 * Runs in small concurrent batches so list/dashboard loads stay responsive.
 */
export async function syncStaleReadinessScores(
  students: Array<{ id: string; readiness_score?: number | null; profile_completeness?: number | null }>,
  options?: { concurrency?: number; limit?: number; forceAll?: boolean },
): Promise<Map<string, ReadinessRefreshResult>> {
  const concurrency = Math.max(1, Math.min(options?.concurrency ?? 6, 12))
  const limit = Math.max(1, options?.limit ?? 120)
  const forceAll = Boolean(options?.forceAll)

  const staleIds = students
    .filter((student) => {
      if (!student?.id) return false
      if (forceAll) return true
      const readiness = Number(student.readiness_score ?? 0)
      const profile = Number(student.profile_completeness ?? 0)
      // Refresh when readiness is missing/zero, or profile completeness never filled.
      return readiness <= 0 || profile <= 0
    })
    .map((student) => student.id)
    .slice(0, limit)

  const updated = new Map<string, ReadinessRefreshResult>()
  for (let i = 0; i < staleIds.length; i += concurrency) {
    const chunk = staleIds.slice(i, i + concurrency)
    const results = await Promise.all(chunk.map((id) => refreshReadinessResult(id)))
    for (const result of results) {
      if (result) updated.set(result.studentId, result)
    }
  }
  return updated
}

export function applyReadinessUpdates<T extends { id: string; readiness_score?: number; readiness_status?: string; profile_completeness?: number; risk_level?: string }>(
  rows: T[],
  updates: Map<string, ReadinessRefreshResult>,
): T[] {
  if (!updates.size) return rows
  return rows.map((row) => {
    const next = updates.get(row.id)
    if (!next) return row
    return {
      ...row,
      readiness_score: next.readinessScore,
      readiness_status: next.readinessStatus,
      profile_completeness: next.profileCompleteness,
      ...(next.riskLevel ? { risk_level: next.riskLevel } : {}),
    }
  })
}

export async function getLatestReadinessSnapshot(
  studentProfileId: string,
): Promise<ReadinessSnapshotRow | null> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('readiness_snapshots')
    .select('*')
    .eq('student_profile_id', studentProfileId)
    .order('calculated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}
