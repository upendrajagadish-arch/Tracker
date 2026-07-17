import type { PublicStudentPerformance, PublicShareCodeNow } from '@/api/placement/studentShare'
import { getLatestEvaluationForStudent } from '@/api/placement/communicationEvaluations'
import { getLatestAptitudeScore, getLatestVerbalScore } from '@/api/placement/assessmentScores'
import { getStudentCodingSnapshot } from '@/api/placement/studentCodingProfile'
import { getStudent, listStudents, type StudentListFilters } from '@/api/placement/students'
import { getCodeNowProfile, listCodeNowChallenges } from '@/api/placement/codeNow'
import { resolvePlatformHandles } from '@/lib/studentPlatformHandles'
import { ALL_CRITERIA_KEYS, type CriteriaKey } from '@/lib/communicationEvaluation'
import { normalizeCodeNowCategory } from '@/lib/codeNowCategories'
import type { UnifiedCard } from '@/types/unified'

const BULK_PDF_CAP = 80

function assessmentFromRow(
  row:
    | {
        score: number | string
        max_score: number | string
        percentage: number
        grade: string
        test_name?: string
        evaluated_at?: string
        category_breakdown?: unknown
      }
    | null,
  fallback?: { percentage: number | null; grade: string | null; at: string | null },
) {
  if (row) {
    const breakdown =
      row.category_breakdown && typeof row.category_breakdown === 'object'
        ? (row.category_breakdown as Record<string, number>)
        : {}
    return {
      score: Number(row.score),
      maxScore: Number(row.max_score),
      percentage: row.percentage,
      grade: row.grade,
      testName: row.test_name || null,
      evaluatedAt: row.evaluated_at || null,
      categoryBreakdown: breakdown,
    }
  }
  if (fallback?.percentage != null) {
    return {
      score: null,
      maxScore: null,
      percentage: fallback.percentage,
      grade: fallback.grade,
      testName: null,
      evaluatedAt: fallback.at,
      categoryBreakdown: {},
    }
  }
  return null
}

async function buildCodeNowBlock(studentProfileId: string): Promise<PublicShareCodeNow | null> {
  const [profile, challenges] = await Promise.all([
    getCodeNowProfile(studentProfileId).catch(() => null),
    listCodeNowChallenges(studentProfileId).catch(() => []),
  ])
  if (!profile && !challenges.length) return null

  const categorySummary: Record<string, number> = {}
  for (const row of challenges) {
    const key = normalizeCodeNowCategory(row.category)
    if (!key) continue
    const pct =
      row.max_score && Number(row.max_score) > 0
        ? Math.round((Number(row.score) / Number(row.max_score)) * 100)
        : Number(row.percentage ?? 0)
    categorySummary[key] = Math.max(categorySummary[key] ?? 0, pct)
  }

  return {
    username: profile?.codenow_username ?? null,
    totalScore: profile?.total_score ?? null,
    maxScore: profile?.max_score ?? null,
    percentage: profile?.percentage ?? null,
    grade: profile?.grade ?? null,
    rank: profile?.rank ?? null,
    totalChallenges: profile?.total_challenges ?? challenges.length,
    solvedChallenges:
      profile?.solved_challenges ??
      challenges.filter((c) => Number(c.score) > 0 || Number(c.percentage) > 0).length,
    lastSyncedAt: profile?.last_synced_at ?? null,
    categorySummary,
  }
}

/** Build the same data shape as the public share card (staff-side, no share token required). */
export async function buildStudentPerformanceProfile(
  studentProfileId: string,
): Promise<PublicStudentPerformance> {
  const student = await getStudent(studentProfileId)
  if (!student) throw new Error('Student not found')

  const [comm, aptitude, verbal, snapshot, codeNow] = await Promise.all([
    getLatestEvaluationForStudent(student.id).catch(() => null),
    getLatestAptitudeScore(student.id).catch(() => null),
    getLatestVerbalScore(student.id).catch(() => null),
    getStudentCodingSnapshot(student.id).catch(() => null),
    buildCodeNowBlock(student.id),
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
    placementStatus: student.placement_status,
    skillsSummary: student.skills_summary || '',
    careerInterest: student.career_interest || '',
    githubUrl: student.github_url?.trim() || null,
    platformHandles: handles,
    cards,
    linkedCount: snapshot?.linked_count ?? 0,
    totalSolved: snapshot?.total_solved ?? 0,
    codingSyncedAt: snapshot?.fetched_at ?? null,
    communication,
    aptitude: assessmentFromRow(aptitude, {
      percentage: student.aptitude_score ?? null,
      grade: student.aptitude_grade ?? null,
      at: student.last_aptitude_at ?? null,
    }),
    verbal: assessmentFromRow(verbal, {
      percentage: student.verbal_score ?? null,
      grade: student.verbal_grade ?? null,
      at: student.last_verbal_at ?? null,
    }),
    codeNow,
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
    if (page >= result.pagination.pages || result.data.length === 0) break
    page += 1
  }

  return {
    ids,
    total,
    capped: total > ids.length,
  }
}

export { BULK_PDF_CAP }
