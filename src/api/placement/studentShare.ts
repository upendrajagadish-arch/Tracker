import { requireSupabase } from '@/lib/supabase'
import { logPlacementAudit } from '@/lib/placementAudit'
import { ensureStudentCodingProfile } from '@/api/placement/studentCodingProfile'
import type { StudentProfileRow } from '@/api/placement/students'
import type { UnifiedCard } from '@/types/unified'
import type { PlatformHandles } from '@/lib/studentPlatformHandles'
import type { CriteriaKey } from '@/lib/communicationEvaluation'

export interface PublicShareCommunication {
  totalScore: number
  maxScore: number
  percentage: number
  grade: string
  evaluatedAt: string | null
  evaluatorName: string | null
  proficiencyTotal: number
  presentationTotal: number
  behaviouralTotal: number
  criteria: Partial<Record<CriteriaKey, number>> | null
}

export interface PublicShareTechSkill {
  name: string
  category: string
  proficiencyLevel: string
  assessedByName: string | null
}

export interface PublicShareAssessment {
  score: number | null
  maxScore: number | null
  percentage: number | null
  grade: string | null
  testName: string | null
  evaluatedAt: string | null
  categoryBreakdown: Record<string, number>
}

export interface PublicShareCodeNow {
  username: string | null
  totalScore: number | null
  maxScore: number | null
  percentage: number | null
  grade: string | null
  rank: number | null
  totalChallenges: number | null
  solvedChallenges: number | null
  lastSyncedAt: string | null
  categorySummary: Record<string, number>
}

export interface PublicStudentPerformance {
  fullName: string
  rollNumber: string
  branch: string
  batch: string
  graduationYear: number | null
  headline: string | null
  cgpa: number | null
  readinessScore: number
  readinessStatus: string
  placementStatus: string
  skillsSummary: string
  careerInterest: string
  githubUrl: string | null
  platformHandles: PlatformHandles
  cards: UnifiedCard[]
  linkedCount: number
  totalSolved: number
  codingSyncedAt: string | null
  communication: PublicShareCommunication | null
  techSkills: PublicShareTechSkill[]
  aptitude: PublicShareAssessment | null
  verbal: PublicShareAssessment | null
  codeNow: PublicShareCodeNow | null
  generatedAt: string | null
}

function createShareToken(): string {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

export function publicStudentPerformanceUrl(token: string): string {
  if (typeof window === 'undefined') return `/public/student-performance/${token}`
  return `${window.location.origin}/public/student-performance/${token}`
}

export async function ensureStudentShareLink(studentProfileId: string): Promise<string> {
  const client = requireSupabase()

  const { data: existing, error: readError } = await client
    .from('student_profiles')
    .select('share_token, is_shareable, full_name')
    .eq('id', studentProfileId)
    .single()
  if (readError) {
    if (/share_token|column/i.test(readError.message)) {
      throw new Error(
        'Share links are not enabled in the database. Run scripts/apply-student-share-migration.sql in Supabase.',
      )
    }
    throw readError
  }

  if (existing.share_token && existing.is_shareable) {
    return existing.share_token
  }

  const token = createShareToken()
  const { data, error } = await client
    .from('student_profiles')
    .update({ share_token: token, is_shareable: true })
    .eq('id', studentProfileId)
    .select('share_token')
    .single()
  if (error) {
    if (/share_token|column/i.test(error.message)) {
      throw new Error(
        'Share links are not enabled in the database. Run scripts/apply-student-share-migration.sql in Supabase.',
      )
    }
    throw error
  }
  if (!data.share_token) throw new Error('Failed to create share link')

  await logPlacementAudit({
    action: 'student_profile.share',
    entityType: 'student_profile',
    entityId: studentProfileId,
    description: `Created public share link for ${existing.full_name}`,
  })

  return data.share_token
}

/** Sync coding snapshot, then ensure a public share token exists. */
export async function prepareStudentShareLink(
  student: Pick<StudentProfileRow, 'id' | 'github_url' | 'platform_handles' | 'full_name'>,
): Promise<string> {
  try {
    await ensureStudentCodingProfile(student)
  } catch {
    // Readiness-only share is still useful if platform fetch fails.
  }
  return ensureStudentShareLink(student.id)
}

function parseAssessment(raw: unknown): PublicShareAssessment | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const payload = raw as Record<string, unknown>
  const breakdown =
    payload.categoryBreakdown && typeof payload.categoryBreakdown === 'object'
      ? (payload.categoryBreakdown as Record<string, number>)
      : {}
  return {
    score: payload.score == null ? null : Number(payload.score),
    maxScore: payload.maxScore == null ? null : Number(payload.maxScore),
    percentage: payload.percentage == null ? null : Number(payload.percentage),
    grade: payload.grade == null ? null : String(payload.grade),
    testName: payload.testName == null ? null : String(payload.testName),
    evaluatedAt: payload.evaluatedAt == null ? null : String(payload.evaluatedAt),
    categoryBreakdown: breakdown,
  }
}

function parseCodeNow(raw: unknown): PublicShareCodeNow | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const payload = raw as Record<string, unknown>
  const summary =
    payload.categorySummary && typeof payload.categorySummary === 'object'
      ? (payload.categorySummary as Record<string, number>)
      : {}
  return {
    username: payload.username == null ? null : String(payload.username),
    totalScore: payload.totalScore == null ? null : Number(payload.totalScore),
    maxScore: payload.maxScore == null ? null : Number(payload.maxScore),
    percentage: payload.percentage == null ? null : Number(payload.percentage),
    grade: payload.grade == null ? null : String(payload.grade),
    rank: payload.rank == null ? null : Number(payload.rank),
    totalChallenges: payload.totalChallenges == null ? null : Number(payload.totalChallenges),
    solvedChallenges: payload.solvedChallenges == null ? null : Number(payload.solvedChallenges),
    lastSyncedAt: payload.lastSyncedAt == null ? null : String(payload.lastSyncedAt),
    categorySummary: summary,
  }
}

function parseCommunication(raw: unknown): PublicShareCommunication | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const payload = raw as Record<string, unknown>
  const criteriaRaw = payload.criteria
  const criteria =
    criteriaRaw && typeof criteriaRaw === 'object' && !Array.isArray(criteriaRaw)
      ? (criteriaRaw as Partial<Record<CriteriaKey, number>>)
      : null
  return {
    totalScore: Number(payload.totalScore ?? 0),
    maxScore: Number(payload.maxScore ?? 250),
    percentage: Number(payload.percentage ?? 0),
    grade: String(payload.grade ?? 'Not Available'),
    evaluatedAt: payload.evaluatedAt == null ? null : String(payload.evaluatedAt),
    evaluatorName: payload.evaluatorName == null ? null : String(payload.evaluatorName),
    proficiencyTotal: Number(payload.proficiencyTotal ?? 0),
    presentationTotal: Number(payload.presentationTotal ?? 0),
    behaviouralTotal: Number(payload.behaviouralTotal ?? 0),
    criteria,
  }
}

function parseTechSkills(raw: unknown): PublicShareTechSkill[] {
  if (!Array.isArray(raw)) return []
  return raw.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const row = item as Record<string, unknown>
    const name = String(row.name ?? '').trim()
    if (!name) return []
    return [{
      name,
      category: String(row.category ?? ''),
      proficiencyLevel: String(row.proficiencyLevel ?? ''),
      assessedByName: row.assessedByName == null || String(row.assessedByName).trim() === ''
        ? null
        : String(row.assessedByName),
    }]
  })
}

export async function getPublicStudentPerformance(
  token: string,
): Promise<PublicStudentPerformance | null> {
  const client = requireSupabase()
  const { data, error } = await client.rpc('get_public_student_performance', { p_token: token })
  if (error) throw error
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null

  const payload = data as Record<string, unknown>
  const rawCards = payload.cards
  const cards = Array.isArray(rawCards) ? (rawCards as UnifiedCard[]) : []

  return {
    fullName: String(payload.fullName ?? ''),
    rollNumber: String(payload.rollNumber ?? ''),
    branch: String(payload.branch ?? ''),
    batch: String(payload.batch ?? ''),
    graduationYear: payload.graduationYear == null ? null : Number(payload.graduationYear),
    headline: payload.headline == null ? null : String(payload.headline),
    cgpa: payload.cgpa == null ? null : Number(payload.cgpa),
    readinessScore: Number(payload.readinessScore ?? 0),
    readinessStatus: String(payload.readinessStatus ?? ''),
    placementStatus: String(payload.placementStatus ?? ''),
    skillsSummary: String(payload.skillsSummary ?? ''),
    careerInterest: String(payload.careerInterest ?? ''),
    githubUrl: payload.githubUrl == null ? null : String(payload.githubUrl),
    platformHandles: (payload.platformHandles as PlatformHandles) ?? {},
    cards,
    linkedCount: Number(payload.linkedCount ?? 0),
    totalSolved: Number(payload.totalSolved ?? 0),
    codingSyncedAt: payload.codingSyncedAt == null ? null : String(payload.codingSyncedAt),
    communication: parseCommunication(payload.communication),
    techSkills: parseTechSkills(payload.techSkills),
    aptitude: parseAssessment(payload.aptitude),
    verbal: parseAssessment(payload.verbal),
    codeNow: parseCodeNow(payload.codeNow),
    generatedAt: payload.generatedAt == null ? null : String(payload.generatedAt),
  }
}
