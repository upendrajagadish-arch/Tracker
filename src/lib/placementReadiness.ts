import type { Database, Json } from '@/types/supabase'
import {
  countLinkedPlatforms,
  resolvePlatformHandles,
} from '@/lib/studentPlatformHandles'

type StudentProfile = Database['public']['Tables']['student_profiles']['Row']
type StudentResume = Database['public']['Tables']['student_resumes']['Row']
type StudentTechSkill = Database['public']['Tables']['student_tech_skills']['Row']
type PlacementInterview = Database['public']['Tables']['placement_interviews']['Row']

/**
 * Placement readiness is eligibility-oriented: profile links, resume, coding
 * platforms, academics — not only formal tech-stack / communication evaluations.
 */
export const READINESS_WEIGHTS = {
  profile: 0.22,
  resume: 0.2,
  technical: 0.2,
  academic: 0.15,
  techStack: 0.13,
  communication: 0.1,
} as const

export type ReadinessStatus =
  | 'highly_ready'
  | 'ready'
  | 'developing'
  | 'needs_work'
  | 'not_ready'

export type RiskLevel = 'low' | 'medium' | 'high'

export interface ReadinessInput {
  student: StudentProfile
  activeResume?: StudentResume | null
  techSkills?: StudentTechSkill[]
  interviews?: PlacementInterview[]
  /** Cached coding problems solved (platforms). */
  totalSolved?: number | null
}

export interface ReadinessResult {
  overallScore: number
  technicalScore: number
  communicationScore: number
  resumeScore: number
  techStackScore: number
  profileScore: number
  academicScore: number
  readinessStatus: ReadinessStatus
  riskLevel: RiskLevel
  profileCompleteness: number
  scoreBreakdown: Record<string, unknown>
}

const PROFICIENCY_SCORE: Record<string, number> = {
  expert: 100,
  advanced: 85,
  intermediate: 70,
  beginner: 50,
  novice: 35,
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function isFilled(value: string | number | null | undefined): boolean {
  if (value === null || value === undefined) return false
  if (typeof value === 'string') return value.trim() !== ''
  return true
}

function averageInterviewScore(
  interviews: PlacementInterview[],
  field: 'technical_score' | 'communication_score' | 'overall_score',
): number {
  if (!interviews.length) return 0
  const sum = interviews.reduce((acc, row) => acc + Number(row[field] ?? 0), 0)
  // Interview scores are stored on a 0–10 scale in the schema.
  return clampScore((sum / interviews.length) * 10)
}

/** Scan profile against placement eligibility checklist (identity, links, content, resume). */
export function scoreProfileCompleteness(
  student: StudentProfile,
  options?: { hasActiveResume?: boolean },
): number {
  const handles = resolvePlatformHandles(student)
  const platformCount = countLinkedPlatforms(handles)
  const checks: boolean[] = [
    isFilled(student.full_name),
    isFilled(student.email),
    isFilled(student.phone),
    isFilled(student.branch),
    isFilled(student.batch) || student.graduation_year != null,
    student.cgpa != null,
    isFilled(student.linkedin_url),
    isFilled(student.github_url) || Boolean(handles.github?.trim()),
    platformCount > 0,
    isFilled(student.skills_summary),
    isFilled(student.career_interest),
    isFilled(student.portfolio_url) || isFilled(student.projects_summary),
    isFilled(student.certifications_summary) || isFilled(student.internship_summary),
    Boolean(options?.hasActiveResume),
  ]
  const filled = checks.filter(Boolean).length
  return clampScore((filled / checks.length) * 100)
}

export function scoreAcademic(student: StudentProfile): number {
  let score = 50
  if (student.cgpa != null) {
    if (student.cgpa >= 9) score = 100
    else if (student.cgpa >= 8) score = 90
    else if (student.cgpa >= 7) score = 75
    else if (student.cgpa >= 6) score = 60
    else score = 40
  }
  if (student.active_backlogs > 0) {
    score -= Math.min(30, student.active_backlogs * 10)
  }
  return clampScore(score)
}

export function scoreTechStack(
  techSkills: StudentTechSkill[],
  skillsSummary?: string | null,
): number {
  if (techSkills.length) {
    const total = techSkills.reduce((acc, skill) => {
      const base = PROFICIENCY_SCORE[skill.proficiency_level.toLowerCase()] ?? 50
      const verified = skill.verification_status === 'verified' ? 10 : 0
      return acc + clampScore(base + verified)
    }, 0)
    const average = total / techSkills.length
    const breadthBonus = Math.min(15, techSkills.length * 3)
    return clampScore(average + breadthBonus)
  }

  // Fall back to free-text skills when structured tech-stack eval is missing.
  const text = (skillsSummary ?? '').trim()
  if (!text) return 0
  const parts = text
    .split(/[,;/|•\n]+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 1)
  const n = Math.max(1, parts.length)
  return clampScore(35 + Math.min(45, n * 8))
}

export function scoreResume(resume?: StudentResume | null): number {
  if (!resume) return 0
  // Unreviewed uploads often have resume_score = 0 — still credit having a file.
  let score = Number(resume.resume_score) > 0 ? Number(resume.resume_score) : 50
  if (resume.review_status === 'approved') score += 10
  if (resume.review_status === 'needs_revision') score += 5
  if (resume.review_status === 'rejected') score -= 20
  if (resume.ats_friendly) score += 5
  return clampScore(score)
}

/** Coding / technical from platforms, solved count, CodeNow, aptitude — interviews win if present. */
export function scoreTechnical(input: {
  student: StudentProfile
  interviews?: PlacementInterview[]
  totalSolved?: number | null
}): number {
  const { student, interviews = [], totalSolved } = input
  const fromInterviews = averageInterviewScore(interviews, 'technical_score')
  if (fromInterviews > 0) return fromInterviews

  const handles = resolvePlatformHandles(student)
  const platformCount = countLinkedPlatforms(handles)

  let fromPlatforms = 0
  if (platformCount >= 1) fromPlatforms = 38
  if (platformCount >= 2) fromPlatforms = 50
  if (platformCount >= 3) fromPlatforms = 62
  if (platformCount >= 4) fromPlatforms = 72
  if (platformCount >= 5) fromPlatforms = 82

  const solved = Number(totalSolved ?? 0)
  const fromSolved =
    solved > 0 ? clampScore(Math.min(100, solved / 3)) : 0

  const codeNow =
    student.codenow_score != null && !Number.isNaN(Number(student.codenow_score))
      ? clampScore(Number(student.codenow_score))
      : 0

  const aptitude =
    student.aptitude_score != null && !Number.isNaN(Number(student.aptitude_score))
      ? clampScore(Number(student.aptitude_score))
      : 0

  const signals = [fromPlatforms, fromSolved, codeNow, aptitude].filter((v) => v > 0)
  if (!signals.length) {
    // Mild baseline only when profile has LinkedIn/GitHub presence.
    if (isFilled(student.linkedin_url) || isFilled(student.github_url)) return 28
    return 18
  }

  const primary = Math.max(...signals)
  const secondaryAvg =
    signals.length > 1
      ? signals.reduce((a, b) => a + b, 0) / signals.length
      : primary
  return clampScore(primary * 0.65 + secondaryAvg * 0.35)
}

export function scoreCommunication(
  student: StudentProfile,
  interviews: PlacementInterview[] = [],
): { score: number; source: string } {
  if (student.communication_score != null && !Number.isNaN(Number(student.communication_score))) {
    return { score: clampScore(Number(student.communication_score)), source: 'evaluation' }
  }
  const fromInterviews = averageInterviewScore(interviews, 'communication_score')
  if (fromInterviews > 0) {
    return { score: fromInterviews, source: 'interview' }
  }
  if (student.verbal_score != null && !Number.isNaN(Number(student.verbal_score))) {
    return { score: clampScore(Number(student.verbal_score)), source: 'verbal' }
  }
  // Soft professional-presence fallback — not a full evaluation substitute.
  if (isFilled(student.linkedin_url)) return { score: 42, source: 'linkedin_presence' }
  return { score: 28, source: 'fallback' }
}

export function readinessStatusFromScore(score: number): ReadinessStatus {
  if (score >= 85) return 'highly_ready'
  if (score >= 70) return 'ready'
  if (score >= 55) return 'developing'
  if (score >= 40) return 'needs_work'
  return 'not_ready'
}

export function riskLevelFromInput(input: ReadinessInput, overallScore: number): RiskLevel {
  const { student, activeResume, techSkills = [] } = input
  const handles = resolvePlatformHandles(student)
  const platformCount = countLinkedPlatforms(handles)
  let riskPoints = 0
  if (!activeResume) riskPoints += 2
  if (overallScore < 50) riskPoints += 2
  if (student.active_backlogs > 0) riskPoints += 1
  if (!techSkills.length && !isFilled(student.skills_summary)) riskPoints += 1
  if (platformCount === 0) riskPoints += 1
  if (!isFilled(student.linkedin_url)) riskPoints += 1
  if (!student.is_placement_eligible) riskPoints += 1
  if (riskPoints >= 5) return 'high'
  if (riskPoints >= 2) return 'medium'
  return 'low'
}

export function calculateReadiness(input: ReadinessInput): ReadinessResult {
  const { student, activeResume, techSkills = [], interviews = [], totalSolved } = input

  const technicalScore = scoreTechnical({ student, interviews, totalSolved })
  const { score: communicationScore, source: communicationSource } = scoreCommunication(
    student,
    interviews,
  )
  const resumeScore = scoreResume(activeResume)
  const techStackScore = scoreTechStack(techSkills, student.skills_summary)
  const profileScore = scoreProfileCompleteness(student, {
    hasActiveResume: Boolean(activeResume),
  })
  const academicScore = scoreAcademic(student)

  const overallScore = clampScore(
    profileScore * READINESS_WEIGHTS.profile
      + resumeScore * READINESS_WEIGHTS.resume
      + technicalScore * READINESS_WEIGHTS.technical
      + academicScore * READINESS_WEIGHTS.academic
      + techStackScore * READINESS_WEIGHTS.techStack
      + communicationScore * READINESS_WEIGHTS.communication,
  )

  const readinessStatus = readinessStatusFromScore(overallScore)
  const riskLevel = riskLevelFromInput(input, overallScore)
  const handles = resolvePlatformHandles(student)

  return {
    overallScore,
    technicalScore,
    communicationScore,
    resumeScore,
    techStackScore,
    profileScore,
    academicScore,
    readinessStatus,
    riskLevel,
    profileCompleteness: profileScore,
    scoreBreakdown: {
      weights: READINESS_WEIGHTS,
      interviewCount: interviews.length,
      techSkillCount: techSkills.length,
      platformCount: countLinkedPlatforms(handles),
      totalSolved: Number(totalSolved ?? 0),
      hasActiveResume: Boolean(activeResume),
      hasLinkedin: isFilled(student.linkedin_url),
      placementEligible: student.is_placement_eligible,
      activeBacklogs: student.active_backlogs,
      communicationSource,
    },
  }
}

/** Convenience for tests / diagnostics when only a Json profile blob is available. */
export function profileHandlesCount(platformHandles: Json | null | undefined): number {
  if (!platformHandles || typeof platformHandles !== 'object' || Array.isArray(platformHandles)) {
    return 0
  }
  return Object.values(platformHandles as Record<string, unknown>).filter(
    (value) => typeof value === 'string' && value.trim(),
  ).length
}
