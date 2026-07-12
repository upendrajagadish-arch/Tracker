import type { Database } from '@/types/supabase'
import type { ReadinessResult } from '@/lib/placementReadiness'

type StudentProfile = Database['public']['Tables']['student_profiles']['Row']
type CompanyRequirement = Database['public']['Tables']['company_requirements']['Row']
type StudentTechSkill = Database['public']['Tables']['student_tech_skills']['Row']
type TechSkill = Database['public']['Tables']['tech_skills']['Row']
type StudentResume = Database['public']['Tables']['student_resumes']['Row']

export type EligibilityStatus = 'eligible' | 'not_eligible'
export type MatchStatus = 'strong_fit' | 'good_fit' | 'partial_fit' | 'not_fit'

export const MATCH_WEIGHTS = {
  eligibilityBase: 30,
  requiredSkills: 25,
  preferredSkills: 10,
  readiness: 15,
  technical: 10,
  communication: 5,
  resume: 5,
} as const

export const INELIGIBLE_SCORE_CAP = 44

export interface MatchingInput {
  student: StudentProfile
  requirement: CompanyRequirement
  readiness: ReadinessResult
  techSkills: Array<StudentTechSkill & { tech_skill?: TechSkill | null }>
  activeResume?: StudentResume | null
}

export interface MatchResult {
  matchScore: number
  matchStatus: MatchStatus
  eligibilityStatus: EligibilityStatus
  matchedSkills: string[]
  missingRequiredSkills: string[]
  scoreBreakdown: Record<string, number | string | boolean | string[]>
}

function normalizeSkill(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '-')
}

function studentSkillKeys(techSkills: MatchingInput['techSkills']): Set<string> {
  const keys = new Set<string>()
  for (const row of techSkills) {
    if (row.tech_skill?.name_key) keys.add(normalizeSkill(row.tech_skill.name_key))
    if (row.tech_skill?.name) keys.add(normalizeSkill(row.tech_skill.name))
  }
  return keys
}

function matchStatusFromScore(score: number, eligible: boolean): MatchStatus {
  if (!eligible) return 'not_fit'
  if (score >= 80) return 'strong_fit'
  if (score >= 65) return 'good_fit'
  if (score >= 50) return 'partial_fit'
  return 'not_fit'
}

export function evaluateEligibility(input: MatchingInput): {
  eligibilityStatus: EligibilityStatus
  reasons: string[]
} {
  const { student, requirement } = input
  const reasons: string[] = []

  if (!student.is_active) reasons.push('inactive_student')
  if (!student.is_placement_eligible) reasons.push('not_placement_eligible')

  if (requirement.eligible_branches.length > 0) {
    const branch = student.branch.trim().toLowerCase()
    const allowed = requirement.eligible_branches.map((b) => b.trim().toLowerCase())
    if (!allowed.includes(branch)) reasons.push('branch_mismatch')
  }

  if (requirement.eligible_batches.length > 0) {
    const batch = student.batch.trim().toLowerCase()
    const allowed = requirement.eligible_batches.map((b) => b.trim().toLowerCase())
    if (!allowed.includes(batch)) reasons.push('batch_mismatch')
  }

  if (requirement.min_cgpa != null) {
    if (student.cgpa == null || student.cgpa < requirement.min_cgpa) reasons.push('cgpa_below_minimum')
  }

  if (student.active_backlogs > 0) reasons.push('active_backlogs')

  if (requirement.min_readiness_score != null) {
    if (input.readiness.overallScore < requirement.min_readiness_score) reasons.push('readiness_below_minimum')
  }

  return {
    eligibilityStatus: reasons.length === 0 ? 'eligible' : 'not_eligible',
    reasons,
  }
}

export function calculateMatchScore(input: MatchingInput): MatchResult {
  const { requirement, readiness, activeResume } = input
  const ownedSkills = studentSkillKeys(input.techSkills)

  const required = requirement.required_skills.map(normalizeSkill)
  const preferred = requirement.preferred_skills.map(normalizeSkill)

  const matchedRequired = required.filter((skill) => ownedSkills.has(skill))
  const missingRequired = required.filter((skill) => !ownedSkills.has(skill))
  const matchedPreferred = preferred.filter((skill) => ownedSkills.has(skill))

  const requiredRatio = required.length ? matchedRequired.length / required.length : 1
  const preferredRatio = preferred.length ? matchedPreferred.length / preferred.length : 1

  const { eligibilityStatus, reasons } = evaluateEligibility(input)
  const eligible = eligibilityStatus === 'eligible'

  const eligibilityComponent = eligible ? MATCH_WEIGHTS.eligibilityBase : 0
  const requiredComponent = MATCH_WEIGHTS.requiredSkills * requiredRatio
  const preferredComponent = MATCH_WEIGHTS.preferredSkills * preferredRatio
  const readinessComponent = (readiness.overallScore / 100) * MATCH_WEIGHTS.readiness
  const technicalComponent = (readiness.technicalScore / 100) * MATCH_WEIGHTS.technical
  const communicationComponent = (readiness.communicationScore / 100) * MATCH_WEIGHTS.communication
  const resumeComponent = ((activeResume ? readiness.resumeScore : 0) / 100) * MATCH_WEIGHTS.resume

  let matchScore = Math.round(
    eligibilityComponent
      + requiredComponent
      + preferredComponent
      + readinessComponent
      + technicalComponent
      + communicationComponent
      + resumeComponent,
  )

  if (!eligible) {
    matchScore = Math.min(matchScore, INELIGIBLE_SCORE_CAP)
  }

  matchScore = Math.max(0, Math.min(100, matchScore))

  return {
    matchScore,
    matchStatus: matchStatusFromScore(matchScore, eligible),
    eligibilityStatus,
    matchedSkills: [...new Set([...matchedRequired, ...matchedPreferred])],
    missingRequiredSkills: missingRequired,
    scoreBreakdown: {
      eligibilityComponent,
      requiredComponent,
      preferredComponent,
      readinessComponent,
      technicalComponent,
      communicationComponent,
      resumeComponent,
      eligibilityReasons: reasons,
      requiredSkillCoverage: requiredRatio,
      preferredSkillCoverage: preferredRatio,
    },
  }
}
