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
  ] = await Promise.all([
    client.from('student_profiles').select('*').eq('id', studentProfileId).single(),
    client
      .from('student_resumes')
      .select('*')
      .eq('student_profile_id', studentProfileId)
      .eq('is_active', true)
      .maybeSingle(),
    client.from('student_tech_skills').select('*').eq('student_profile_id', studentProfileId),
  ])

  if (studentRes.error) throw studentRes.error
  if (resumeRes.error) throw resumeRes.error
  if (techSkillsRes.error) throw techSkillsRes.error

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
