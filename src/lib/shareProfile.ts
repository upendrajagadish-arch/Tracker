import type { CriteriaKey } from '@/lib/communicationEvaluation'
import type { PlatformHandles } from '@/lib/studentPlatformHandles'
import type { UnifiedCard } from '@/types/unified'
import type { OverallPerformanceSummary } from '@/lib/overallPerformance'
import {
  buildOverallPerformanceSummary,
  codingPercentFromSolved,
  githubPercentFromActivity,
} from '@/lib/overallPerformance'
import { getLatestEvaluationForStudent } from '@/api/placement/communicationEvaluations'
import { getLatestAptitudeScore, getLatestVerbalScore } from '@/api/placement/assessmentScores'
import { getStudentCodingSnapshot } from '@/api/placement/studentCodingProfile'
import { getStudent, type StudentProfileRow } from '@/api/placement/students'
import { resolvePlatformHandles } from '@/lib/studentPlatformHandles'
import { ALL_CRITERIA_KEYS, COMMUNICATION_SECTIONS } from '@/lib/communicationEvaluation'

export interface ShareCommunicationBlock {
  totalScore: number
  maxScore: number
  percentage: number
  grade: string
  evaluatedAt: string | null
  proficiencyTotal: number
  presentationTotal: number
  behaviouralTotal: number
  criteria: Partial<Record<CriteriaKey, number>> | null
}

export interface ShareAssessmentBlock {
  score: number | null
  maxScore: number | null
  percentage: number | null
  grade: string | null
  testName: string | null
  evaluatedAt: string | null
  categoryBreakdown: Record<string, number>
}

export interface ShareStudentIdentity {
  fullName: string
  rollNumber: string
  branch: string
  batch: string
  graduationYear: number | null
  headline: string | null
  skillsSummary: string
  careerInterest: string
  githubUrl: string | null
  /** Email intentionally omitted from public view model. */
}

export interface StudentShareProfileData {
  student: ShareStudentIdentity
  codingPlatforms: {
    handles: PlatformHandles
    cards: UnifiedCard[]
    linkedCount: number
    totalSolved: number
    syncedAt: string | null
  }
  github: {
    username: string | null
    profileUrl: string | null
  }
  communication: ShareCommunicationBlock | null
  aptitude: ShareAssessmentBlock | null
  verbal: ShareAssessmentBlock | null
  overallSummary: OverallPerformanceSummary
  generatedAt: string
}

function naAssessment(
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
  profileFallback?: { percentage: number | null; grade: string | null; at: string | null },
): ShareAssessmentBlock | null {
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
  if (profileFallback?.percentage != null) {
    return {
      score: null,
      maxScore: null,
      percentage: profileFallback.percentage,
      grade: profileFallback.grade,
      testName: null,
      evaluatedAt: profileFallback.at,
      categoryBreakdown: {},
    }
  }
  return null
}

function githubFromStudent(student: StudentProfileRow, handles: PlatformHandles) {
  const username = handles.github?.trim() || null
  const url =
    student.github_url?.trim() ||
    (username ? `https://github.com/${username}` : null)
  return { username, profileUrl: url }
}

function githubActivityFromCards(cards: UnifiedCard[]) {
  const gh = cards.find((c) => c.platform === 'github')
  if (!gh) return { commits: null as number | null, repositories: null as number | null, stars: null as number | null }
  return {
    commits: gh.stats.totalSolved ?? null,
    repositories: null,
    stars: gh.rating?.current ?? gh.contests?.rating ?? null,
  }
}

export async function buildStudentShareProfileData(
  studentProfileId: string,
): Promise<StudentShareProfileData> {
  const student = await getStudent(studentProfileId)
  if (!student) throw new Error('Student not found')

  const [comm, aptitude, verbal, snapshot] = await Promise.all([
    getLatestEvaluationForStudent(student.id).catch(() => null),
    getLatestAptitudeScore(student.id).catch(() => null),
    getLatestVerbalScore(student.id).catch(() => null),
    getStudentCodingSnapshot(student.id).catch(() => null),
  ])

  const handles = resolvePlatformHandles(student)
  const cards = (snapshot?.cards as UnifiedCard[] | undefined) ?? []
  const github = githubFromStudent(student, handles)
  const githubActivity = githubActivityFromCards(cards)

  const communication: ShareCommunicationBlock | null = comm
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
        ) as Record<CriteriaKey, number>,
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

  const aptitudeBlock = naAssessment(aptitude, {
    percentage: student.aptitude_score ?? null,
    grade: student.aptitude_grade ?? null,
    at: student.last_aptitude_at ?? null,
  })
  const verbalBlock = naAssessment(verbal, {
    percentage: student.verbal_score ?? null,
    grade: student.verbal_grade ?? null,
    at: student.last_verbal_at ?? null,
  })

  const overallSummary = buildOverallPerformanceSummary({
    codingPercent: codingPercentFromSolved(snapshot?.total_solved ?? null),
    githubPercent: githubPercentFromActivity(githubActivity),
    communicationPercent: communication?.percentage ?? null,
    aptitudePercent: aptitudeBlock?.percentage ?? null,
    verbalPercent: verbalBlock?.percentage ?? null,
  })

  return {
    student: {
      fullName: student.full_name,
      rollNumber: student.roll_number,
      branch: student.branch,
      batch: student.batch,
      graduationYear: student.graduation_year,
      headline: student.career_interest?.trim() || null,
      skillsSummary: student.skills_summary || '',
      careerInterest: student.career_interest || '',
      githubUrl: github.profileUrl,
    },
    codingPlatforms: {
      handles,
      cards,
      linkedCount: snapshot?.linked_count ?? 0,
      totalSolved: snapshot?.total_solved ?? 0,
      syncedAt: snapshot?.fetched_at ?? null,
    },
    github,
    communication,
    aptitude: aptitudeBlock,
    verbal: verbalBlock,
    overallSummary,
    generatedAt: new Date().toISOString(),
  }
}

export { COMMUNICATION_SECTIONS, ALL_CRITERIA_KEYS }
