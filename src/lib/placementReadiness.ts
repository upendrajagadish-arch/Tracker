import type { Database } from '@/types/supabase'

type StudentProfile = Database['public']['Tables']['student_profiles']['Row']
type StudentResume = Database['public']['Tables']['student_resumes']['Row']
type StudentTechSkill = Database['public']['Tables']['student_tech_skills']['Row']
type PlacementInterview = Database['public']['Tables']['placement_interviews']['Row']

export const READINESS_WEIGHTS = {
  technical: 0.25,
  communication: 0.2,
  resume: 0.2,
  techStack: 0.15,
  profile: 0.1,
  academic: 0.1,
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

function averageInterviewScore(interviews: PlacementInterview[], field: 'technical_score' | 'communication_score' | 'overall_score'): number {
  if (!interviews.length) return 0
  const sum = interviews.reduce((acc, row) => acc + Number(row[field] ?? 0), 0)
  // Interview scores are stored on a 0–10 scale in the schema.
  return clampScore((sum / interviews.length) * 10)
}

export function scoreProfileCompleteness(student: StudentProfile): number {
  const fields: Array<string | number | null> = [
    student.full_name,
    student.email,
    student.phone,
    student.branch,
    student.batch,
    student.cgpa,
    student.linkedin_url,
    student.github_url,
    student.skills_summary,
    student.career_interest,
  ]
  const filled = fields.filter((value) => {
    if (value === null || value === undefined) return false
    if (typeof value === 'string') return value.trim() !== ''
    return true
  }).length
  return clampScore((filled / fields.length) * 100)
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

export function scoreTechStack(techSkills: StudentTechSkill[]): number {
  if (!techSkills.length) return 0
  const total = techSkills.reduce((acc, skill) => {
    const base = PROFICIENCY_SCORE[skill.proficiency_level.toLowerCase()] ?? 50
    const verified = skill.verification_status === 'verified' ? 10 : 0
    return acc + clampScore(base + verified)
  }, 0)
  const average = total / techSkills.length
  const breadthBonus = Math.min(15, techSkills.length * 3)
  return clampScore(average + breadthBonus)
}

export function scoreResume(resume?: StudentResume | null): number {
  if (!resume) return 0
  let score = resume.resume_score
  if (resume.review_status === 'approved') score += 10
  if (resume.review_status === 'rejected') score -= 20
  if (resume.ats_friendly) score += 5
  return clampScore(score)
}

export function readinessStatusFromScore(score: number): ReadinessStatus {
  if (score >= 85) return 'highly_ready'
  if (score >= 70) return 'ready'
  if (score >= 55) return 'developing'
  if (score >= 40) return 'needs_work'
  return 'not_ready'
}

export function riskLevelFromInput(input: ReadinessInput, overallScore: number): RiskLevel {
  const { student, activeResume, techSkills = [], interviews = [] } = input
  let riskPoints = 0
  if (!activeResume) riskPoints += 2
  if (overallScore < 50) riskPoints += 2
  if (student.active_backlogs > 0) riskPoints += 1
  if (!techSkills.length) riskPoints += 1
  if (!interviews.length) riskPoints += 1
  if (!student.is_placement_eligible) riskPoints += 2
  if (riskPoints >= 5) return 'high'
  if (riskPoints >= 2) return 'medium'
  return 'low'
}

export function calculateReadiness(input: ReadinessInput): ReadinessResult {
  const { student, activeResume, techSkills = [], interviews = [] } = input

  const technicalScore = averageInterviewScore(interviews, 'technical_score') || clampScore(student.readiness_score * 0.6)
  const communicationScore = averageInterviewScore(interviews, 'communication_score')
  const resumeScore = scoreResume(activeResume)
  const techStackScore = scoreTechStack(techSkills)
  const profileScore = scoreProfileCompleteness(student)
  const academicScore = scoreAcademic(student)

  const overallScore = clampScore(
    technicalScore * READINESS_WEIGHTS.technical
      + communicationScore * READINESS_WEIGHTS.communication
      + resumeScore * READINESS_WEIGHTS.resume
      + techStackScore * READINESS_WEIGHTS.techStack
      + profileScore * READINESS_WEIGHTS.profile
      + academicScore * READINESS_WEIGHTS.academic,
  )

  const readinessStatus = readinessStatusFromScore(overallScore)
  const riskLevel = riskLevelFromInput(input, overallScore)
  const profileCompleteness = profileScore

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
    profileCompleteness,
    scoreBreakdown: {
      weights: READINESS_WEIGHTS,
      interviewCount: interviews.length,
      techSkillCount: techSkills.length,
      hasActiveResume: Boolean(activeResume),
      placementEligible: student.is_placement_eligible,
      activeBacklogs: student.active_backlogs,
    },
  }
}
