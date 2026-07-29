import type { PublicStudentPerformance, PublicShareCodeNow } from '@/api/placement/studentShare'
import { getLatestEvaluationForStudent } from '@/api/placement/communicationEvaluations'
import { getStudentCodingSnapshot } from '@/api/placement/studentCodingProfile'
import { getStudent, listStudents, type StudentListFilters } from '@/api/placement/students'
import { listStudentSkills } from '@/api/placement/techSkills'
import { resolvePlatformHandles } from '@/lib/studentPlatformHandles'
import { ALL_CRITERIA_KEYS, type CriteriaKey } from '@/lib/communicationEvaluation'
import { certificationLinksFromSummary } from '@/lib/certificationsSummary'
import type { UnifiedCard } from '@/types/unified'

export const BULK_PDF_CAP = 80

/** Build the same data shape as the public share card (staff-side, no share token required). */
export async function buildStudentPerformanceProfile(
  studentProfileId: string,
): Promise<PublicStudentPerformance> {
  const student = await getStudent(studentProfileId)
  if (!student) throw new Error('Student not found')

  const [comm, snapshot, techSkills] = await Promise.all([
    getLatestEvaluationForStudent(student.id).catch(() => null),
    getStudentCodingSnapshot(student.id).catch(() => null),
    listStudentSkills(student.id).catch(() => []),
  ])

  const handles = resolvePlatformHandles(student)
  const cards = (snapshot?.cards as UnifiedCard[] | undefined) ?? []

  const communication = comm
    ? {
        totalScore: comm.total_score,
        maxScore: comm.max_score || 250,
        percentage: comm.percentage,
        grade: comm.grade,
        evaluatedAt: comm.evaluation_date,
        evaluatorName: comm.evaluator_name?.trim() || null,
        proficiencyTotal: comm.communication_proficiency_total,
        presentationTotal: comm.presentation_skills_total,
        behaviouralTotal: comm.behavioural_skills_total,
        criteria: Object.fromEntries(
          ALL_CRITERIA_KEYS.map((key) => [key, comm[key] as number]),
        ) as Partial<Record<CriteriaKey, number>>,
      }
    : student.communication_score != null
      ? {
          totalScore: Math.round((Number(student.communication_score) / 100) * 250),
          maxScore: 250,
          percentage: Number(student.communication_score),
          grade: student.communication_grade || 'Not Available',
          evaluatedAt: student.last_communication_evaluation_at,
          evaluatorName: null,
          proficiencyTotal: 0,
          presentationTotal: 0,
          behaviouralTotal: 0,
          criteria: null,
        }
      : null

  return {
    fullName: student.full_name,
    rollNumber: student.roll_number,
    branch: student.branch,
    batch: student.academic_batch || student.batch,
    graduationYear: student.graduation_year,
    headline: student.career_interest?.trim() || null,
    cgpa: student.cgpa == null ? null : Number(student.cgpa),
    readinessScore: student.readiness_score,
    readinessStatus: student.readiness_status,
    profileCompleteness: Number(student.profile_completeness ?? 0),
    placementStatus: student.placement_status,
    skillsSummary: student.skills_summary || '',
    careerInterest: student.career_interest || '',
    phone: student.phone?.trim() || null,
    dateOfBirth: student.date_of_birth,
    linkedinUrl: student.linkedin_url?.trim() || null,
    portfolioUrl: student.portfolio_url?.trim() || null,
    projectsSummary: student.projects_summary?.trim() || null,
    certificationLinks: certificationLinksFromSummary(student.certifications_summary),
    githubUrl: student.github_url?.trim() || null,
    platformHandles: handles,
    cards,
    linkedCount: snapshot?.linked_count ?? 0,
    totalSolved: snapshot?.total_solved ?? 0,
    codingSyncedAt: snapshot?.fetched_at ?? null,
    communication,
    techSkills: techSkills.map((skill) => ({
      name: skill.tech_skill?.name ?? skill.tech_skill_id,
      category: skill.tech_skill?.category ?? '',
      proficiencyLevel: skill.proficiency_level,
      assessedByName: skill.assessed_by_name?.trim() || null,
    })),
    aptitude: null,
    verbal: null,
    codeNow: null as PublicShareCodeNow | null,
    generatedAt: new Date().toISOString(),
  }
}

export async function listStudentIdsForPerformancePdf(
  filters: Pick<StudentListFilters, 'q' | 'branch' | 'batch' | 'academicBatch' | 'placementStatus'>,
): Promise<{ ids: string[]; total: number; capped: boolean }> {
  const pageSize = 100
  let page = 1
  let total = 0
  const ids: string[] = []

  while (ids.length < BULK_PDF_CAP) {
    const result = await listStudents({
      ...filters,
      page,
      limit: pageSize,
    })
    total = result.pagination.total
    for (const row of result.data) {
      ids.push(row.id)
      if (ids.length >= BULK_PDF_CAP) break
    }
    if (page * pageSize >= total) break
    page += 1
  }

  return { ids, total, capped: total > BULK_PDF_CAP }
}
