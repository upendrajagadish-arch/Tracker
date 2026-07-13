import { requireSupabase } from '@/lib/supabase'
import { logPlacementAudit } from '@/lib/placementAudit'
import { ensureStudentCodingProfile } from '@/api/placement/studentCodingProfile'
import type { StudentProfileRow } from '@/api/placement/students'
import type { UnifiedCard } from '@/types/unified'
import type { PlatformHandles } from '@/lib/studentPlatformHandles'

export interface PublicStudentPerformance {
  fullName: string
  rollNumber: string
  branch: string
  batch: string
  cgpa: number | null
  readinessScore: number
  readinessStatus: string
  placementStatus: string
  skillsSummary: string
  careerInterest: string
  platformHandles: PlatformHandles
  cards: UnifiedCard[]
  linkedCount: number
  totalSolved: number
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
      throw new Error('Share links are not enabled in the database. Run scripts/apply-student-share-migration.sql in Supabase.')
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
      throw new Error('Share links are not enabled in the database. Run scripts/apply-student-share-migration.sql in Supabase.')
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

export async function getPublicStudentPerformance(token: string): Promise<PublicStudentPerformance | null> {
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
    cgpa: payload.cgpa == null ? null : Number(payload.cgpa),
    readinessScore: Number(payload.readinessScore ?? 0),
    readinessStatus: String(payload.readinessStatus ?? ''),
    placementStatus: String(payload.placementStatus ?? ''),
    skillsSummary: String(payload.skillsSummary ?? ''),
    careerInterest: String(payload.careerInterest ?? ''),
    platformHandles: (payload.platformHandles as PlatformHandles) ?? {},
    cards,
    linkedCount: Number(payload.linkedCount ?? 0),
    totalSolved: Number(payload.totalSolved ?? 0),
  }
}
