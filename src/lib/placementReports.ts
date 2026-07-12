import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

type Client = SupabaseClient<Database>
type StudentProfile = Database['public']['Tables']['student_profiles']['Row']

export type PlacementReportType =
  | 'branch-summary'
  | 'batch-summary'
  | 'readiness-overview'
  | 'skill-gap'
  | 'placement-status'
  | 'resume-review'
  | 'company-pipeline'

export interface ReportFilters {
  branch?: string
  batch?: string
  placementStatus?: string
  readinessStatus?: string
  minReadinessScore?: number
  maxReadinessScore?: number
  reviewStatus?: string
  companyId?: string
  requirementId?: string
}

export interface ReportResult {
  reportType: PlacementReportType
  generatedAt: string
  filters: ReportFilters
  summary: Record<string, number | string>
  rows: Array<Record<string, unknown>>
}

export interface ManagementSummary {
  totalStudents: number
  activeStudents: number
  placementEligible: number
  averageReadiness: number
  readyCount: number
  placedCount: number
  pendingResumes: number
  activeCompanies: number
  openRequirements: number
  generatedAt: string
}

function applyStudentFilters<T extends { eq: (col: string, val: string | number | boolean) => T; gte: (col: string, val: number) => T; lte: (col: string, val: number) => T }>(
  query: T,
  filters: ReportFilters,
): T {
  let next = query
  if (filters.branch) next = next.eq('branch', filters.branch)
  if (filters.batch) next = next.eq('batch', filters.batch)
  if (filters.placementStatus) next = next.eq('placement_status', filters.placementStatus)
  if (filters.readinessStatus) next = next.eq('readiness_status', filters.readinessStatus)
  if (filters.minReadinessScore != null) next = next.gte('readiness_score', filters.minReadinessScore)
  if (filters.maxReadinessScore != null) next = next.lte('readiness_score', filters.maxReadinessScore)
  return next
}

async function fetchFilteredStudents(client: Client, filters: ReportFilters): Promise<StudentProfile[]> {
  let query = client.from('student_profiles').select('*').eq('is_active', true)
  query = applyStudentFilters(query, filters)
  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function buildPlacementReport(
  client: Client,
  reportType: PlacementReportType,
  filters: ReportFilters = {},
): Promise<ReportResult> {
  const generatedAt = new Date().toISOString()

  switch (reportType) {
    case 'branch-summary': {
      const students = await fetchFilteredStudents(client, filters)
      const byBranch = new Map<string, { count: number; avgReadiness: number; placed: number }>()
      for (const student of students) {
        const key = student.branch || 'Unknown'
        const current = byBranch.get(key) ?? { count: 0, avgReadiness: 0, placed: 0 }
        current.count += 1
        current.avgReadiness += student.readiness_score
        if (student.placement_status === 'PLACED') current.placed += 1
        byBranch.set(key, current)
      }
      const rows = [...byBranch.entries()].map(([branch, stats]) => ({
        branch,
        studentCount: stats.count,
        averageReadiness: stats.count ? Math.round(stats.avgReadiness / stats.count) : 0,
        placedCount: stats.placed,
      }))
      return {
        reportType,
        generatedAt,
        filters,
        summary: { totalStudents: students.length, branchCount: rows.length },
        rows,
      }
    }
    case 'batch-summary': {
      const students = await fetchFilteredStudents(client, filters)
      const byBatch = new Map<string, { count: number; avgReadiness: number }>()
      for (const student of students) {
        const key = student.batch || 'Unknown'
        const current = byBatch.get(key) ?? { count: 0, avgReadiness: 0 }
        current.count += 1
        current.avgReadiness += student.readiness_score
        byBatch.set(key, current)
      }
      const rows = [...byBatch.entries()].map(([batch, stats]) => ({
        batch,
        studentCount: stats.count,
        averageReadiness: stats.count ? Math.round(stats.avgReadiness / stats.count) : 0,
      }))
      return {
        reportType,
        generatedAt,
        filters,
        summary: { totalStudents: students.length, batchCount: rows.length },
        rows,
      }
    }
    case 'readiness-overview': {
      const students = await fetchFilteredStudents(client, filters)
      const buckets: Record<string, number> = {
        highly_ready: 0,
        ready: 0,
        developing: 0,
        needs_work: 0,
        not_ready: 0,
      }
      for (const student of students) {
        const key = student.readiness_status in buckets ? student.readiness_status : 'not_ready'
        buckets[key] += 1
      }
      const rows = Object.entries(buckets).map(([status, count]) => ({ readinessStatus: status, count }))
      const avg = students.length
        ? Math.round(students.reduce((sum, s) => sum + s.readiness_score, 0) / students.length)
        : 0
      return {
        reportType,
        generatedAt,
        filters,
        summary: { totalStudents: students.length, averageReadiness: avg },
        rows,
      }
    }
    case 'skill-gap': {
      const students = await fetchFilteredStudents(client, filters)
      const studentIds = students.map((s) => s.id)
      if (!studentIds.length) {
        return { reportType, generatedAt, filters, summary: { totalStudents: 0 }, rows: [] }
      }
      const { data: studentSkills, error } = await client
        .from('student_tech_skills')
        .select('tech_skill_id')
        .in('student_profile_id', studentIds)
      if (error) throw error

      const skillIds = [...new Set((studentSkills ?? []).map((row) => row.tech_skill_id))]
      const { data: skills, error: skillsError } = skillIds.length
        ? await client.from('tech_skills').select('id, name, name_key, category').in('id', skillIds)
        : { data: [], error: null }
      if (skillsError) throw skillsError
      const skillById = new Map((skills ?? []).map((skill) => [skill.id, skill]))

      const coverage = new Map<string, { skill: string; category: string; count: number }>()
      for (const row of studentSkills ?? []) {
        const skill = skillById.get(row.tech_skill_id)
        if (!skill) continue
        const key = skill.name_key
        const current = coverage.get(key) ?? { skill: skill.name, category: skill.category, count: 0 }
        current.count += 1
        coverage.set(key, current)
      }
      const rows = [...coverage.values()]
        .map((entry) => ({
          skill: entry.skill,
          category: entry.category,
          studentCount: entry.count,
          coveragePct: Math.round((entry.count / students.length) * 100),
        }))
        .sort((a, b) => a.coveragePct - b.coveragePct)
      return {
        reportType,
        generatedAt,
        filters,
        summary: { totalStudents: students.length, skillCount: rows.length },
        rows,
      }
    }
    case 'placement-status': {
      const students = await fetchFilteredStudents(client, filters)
      const statusMap = new Map<string, number>()
      for (const student of students) {
        statusMap.set(student.placement_status, (statusMap.get(student.placement_status) ?? 0) + 1)
      }
      const rows = [...statusMap.entries()].map(([placementStatus, count]) => ({ placementStatus, count }))
      return {
        reportType,
        generatedAt,
        filters,
        summary: { totalStudents: students.length, statusCount: rows.length },
        rows,
      }
    }
    case 'resume-review': {
      let resumeQuery = client
        .from('student_resumes')
        .select('id, review_status, resume_score, student_profile_id')
        .eq('is_active', true)
      if (filters.reviewStatus) resumeQuery = resumeQuery.eq('review_status', filters.reviewStatus)
      const { data, error } = await resumeQuery
      if (error) throw error

      const profileIds = [...new Set((data ?? []).map((row) => row.student_profile_id))]
      const { data: profiles, error: profileError } = profileIds.length
        ? await client.from('student_profiles').select('id, branch, batch, full_name, roll_number').in('id', profileIds)
        : { data: [], error: null }
      if (profileError) throw profileError
      const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]))

      const rows = (data ?? []).map((row) => ({
        resumeId: row.id,
        reviewStatus: row.review_status,
        resumeScore: row.resume_score,
        studentProfileId: row.student_profile_id,
        student: profileById.get(row.student_profile_id) ?? null,
      }))
      const pending = rows.filter((row) => row.reviewStatus === 'pending').length
      return {
        reportType,
        generatedAt,
        filters,
        summary: { totalResumes: rows.length, pendingReviews: pending },
        rows,
      }
    }
    case 'company-pipeline': {
      let reqQuery = client
        .from('company_requirements')
        .select('id, role_title, status, company_id')
      if (filters.companyId) reqQuery = reqQuery.eq('company_id', filters.companyId)
      if (filters.requirementId) reqQuery = reqQuery.eq('id', filters.requirementId)
      const { data: requirements, error: reqError } = await reqQuery
      if (reqError) throw reqError

      const companyIds = [...new Set((requirements ?? []).map((r) => r.company_id))]
      const { data: companies, error: companyError } = companyIds.length
        ? await client.from('companies').select('id, name').in('id', companyIds)
        : { data: [], error: null }
      if (companyError) throw companyError
      const companyById = new Map((companies ?? []).map((company) => [company.id, company]))

      const requirementIds = (requirements ?? []).map((r) => r.id)
      let matches: Array<{ requirement_id: string; match_status: string; match_score: number }> = []
      if (requirementIds.length) {
        const { data, error } = await client
          .from('company_match_snapshots')
          .select('requirement_id, match_status, match_score')
          .in('requirement_id', requirementIds)
        if (error) throw error
        matches = data ?? []
      }

      const rows = (requirements ?? []).map((req) => {
        const reqMatches = matches.filter((m) => m.requirement_id === req.id)
        const strong = reqMatches.filter((m) => m.match_status === 'strong_fit').length
        const good = reqMatches.filter((m) => m.match_status === 'good_fit').length
        const company = companyById.get(req.company_id)
        return {
          requirementId: req.id,
          roleTitle: req.role_title,
          status: req.status,
          companyName: company?.name ?? '',
          matchCount: reqMatches.length,
          strongFitCount: strong,
          goodFitCount: good,
          averageMatchScore: reqMatches.length
            ? Math.round(reqMatches.reduce((sum, m) => sum + m.match_score, 0) / reqMatches.length)
            : 0,
        }
      })
      return {
        reportType,
        generatedAt,
        filters,
        summary: { requirementCount: rows.length, totalMatches: matches.length },
        rows,
      }
    }
    default:
      throw new Error(`Unsupported report type: ${reportType}`)
  }
}

export async function buildManagementSummary(client: Client): Promise<ManagementSummary> {
  const [
    studentsRes,
    resumesRes,
    companiesRes,
    requirementsRes,
  ] = await Promise.all([
    client.from('student_profiles').select('id, is_active, is_placement_eligible, readiness_score, readiness_status, placement_status'),
    client.from('student_resumes').select('id, review_status').eq('is_active', true),
    client.from('companies').select('id').eq('is_active', true),
    client.from('company_requirements').select('id, status'),
  ])

  if (studentsRes.error) throw studentsRes.error
  if (resumesRes.error) throw resumesRes.error
  if (companiesRes.error) throw companiesRes.error
  if (requirementsRes.error) throw requirementsRes.error

  const students = studentsRes.data ?? []
  const activeStudents = students.filter((s) => s.is_active)
  const readyCount = activeStudents.filter((s) => ['ready', 'highly_ready'].includes(s.readiness_status)).length
  const placedCount = activeStudents.filter((s) => s.placement_status === 'PLACED').length
  const averageReadiness = activeStudents.length
    ? Math.round(activeStudents.reduce((sum, s) => sum + s.readiness_score, 0) / activeStudents.length)
    : 0
  const pendingResumes = (resumesRes.data ?? []).filter((r) => r.review_status === 'pending').length
  const openRequirements = (requirementsRes.data ?? []).filter((r) => r.status === 'open' || r.status === 'active').length

  return {
    totalStudents: students.length,
    activeStudents: activeStudents.length,
    placementEligible: activeStudents.filter((s) => s.is_placement_eligible).length,
    averageReadiness,
    readyCount,
    placedCount,
    pendingResumes,
    activeCompanies: (companiesRes.data ?? []).length,
    openRequirements,
    generatedAt: new Date().toISOString(),
  }
}

export function reportToCsv(report: ReportResult): string {
  if (!report.rows.length) return ''
  const headers = Object.keys(report.rows[0])
  const escape = (value: unknown) => {
    const text = value == null ? '' : String(value)
    if (text.includes(',') || text.includes('"') || text.includes('\n')) {
      return `"${text.replace(/"/g, '""')}"`
    }
    return text
  }
  const lines = [
    headers.join(','),
    ...report.rows.map((row) => headers.map((header) => escape(row[header])).join(',')),
  ]
  return lines.join('\n')
}
