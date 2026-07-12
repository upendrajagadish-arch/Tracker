import { fetchCard, ALL_PLATFORMS } from '@/api/cards'
import type { StudentProfileRow } from '@/api/placement/students'
import { requireSupabase } from '@/lib/supabase'
import {
  platformHandlesToUsernames,
  resolvePlatformHandles,
  type PlatformHandles,
} from '@/lib/studentPlatformHandles'
import type { Json } from '@/types/supabase'
import type { UnifiedCard } from '@/types/unified'

export type StudentCodingSnapshotRow = {
  id: string
  student_profile_id: string
  platform_handles: Json
  cards: Json
  total_solved: number
  linked_count: number
  fetch_status: 'pending' | 'success' | 'partial' | 'failed' | 'no_handles'
  fetch_error: string | null
  fetched_at: string | null
  created_at: string
  updated_at: string
}

const SNAPSHOT_TTL_MS = 24 * 60 * 60 * 1000

function normalizeHandles(handles: PlatformHandles): PlatformHandles {
  return Object.fromEntries(
    Object.entries(handles)
      .filter(([, value]) => typeof value === 'string' && value.trim())
      .map(([key, value]) => [key, (value as string).trim()]),
  ) as PlatformHandles
}

function handlesFingerprint(handles: PlatformHandles): string {
  return JSON.stringify(
    Object.fromEntries(
      Object.entries(normalizeHandles(handles)).sort(([a], [b]) => a.localeCompare(b)),
    ),
  )
}

export function parseSnapshotCards(snapshot: StudentCodingSnapshotRow | null): UnifiedCard[] {
  if (!snapshot?.cards || !Array.isArray(snapshot.cards)) return []
  return snapshot.cards as unknown as UnifiedCard[]
}

export function snapshotNeedsRefresh(
  snapshot: StudentCodingSnapshotRow | null,
  handles: PlatformHandles,
): boolean {
  if (!snapshot?.fetched_at) return true
  if (handlesFingerprint(snapshot.platform_handles as PlatformHandles) !== handlesFingerprint(handles)) {
    return true
  }
  return Date.now() - new Date(snapshot.fetched_at).getTime() > SNAPSHOT_TTL_MS
}

export async function getStudentCodingSnapshot(
  studentProfileId: string,
): Promise<StudentCodingSnapshotRow | null> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('student_coding_snapshots')
    .select('*')
    .eq('student_profile_id', studentProfileId)
    .maybeSingle()
  if (error) throw error
  return data as StudentCodingSnapshotRow | null
}

async function upsertStudentCodingSnapshot(input: {
  studentProfileId: string
  handles: PlatformHandles
  cards: UnifiedCard[]
  fetchStatus: StudentCodingSnapshotRow['fetch_status']
  fetchError?: string | null
}) {
  const client = requireSupabase()
  const totalSolved = input.cards.reduce((sum, card) => {
    if (card.category === 'development') return sum
    return sum + (card.stats.totalSolved ?? 0)
  }, 0)

  const row = {
    student_profile_id: input.studentProfileId,
    platform_handles: normalizeHandles(input.handles) as Json,
    cards: input.cards as unknown as Json,
    total_solved: totalSolved,
    linked_count: input.cards.length,
    fetch_status: input.fetchStatus,
    fetch_error: input.fetchError ?? null,
    fetched_at: new Date().toISOString(),
  }

  const { data, error } = await client
    .from('student_coding_snapshots')
    .upsert(row, { onConflict: 'student_profile_id' })
    .select('*')
    .single()
  if (error) throw error
  return data as StudentCodingSnapshotRow
}

export async function syncStudentCodingProfile(
  student: Pick<StudentProfileRow, 'id' | 'github_url' | 'platform_handles'>,
): Promise<StudentCodingSnapshotRow> {
  const handles = normalizeHandles(resolvePlatformHandles(student))
  const linked = ALL_PLATFORMS.flatMap((platform) => {
    const username = handles[platform]?.trim()
    return username ? [{ platform, username }] : []
  })

  if (!linked.length) {
    return upsertStudentCodingSnapshot({
      studentProfileId: student.id,
      handles,
      cards: [],
      fetchStatus: 'no_handles',
    })
  }

  const results = await Promise.all(
    linked.map(async ({ platform, username }) => {
      try {
        return { card: await fetchCard(platform, username), error: null as string | null }
      } catch (error) {
        return {
          card: null,
          error: error instanceof Error ? error.message : 'Fetch failed',
        }
      }
    }),
  )

  const cards = results.flatMap((result) => (result.card ? [result.card] : []))
  const errors = results.map((result) => result.error).filter((value): value is string => !!value)

  let fetchStatus: StudentCodingSnapshotRow['fetch_status'] = 'success'
  if (!cards.length) fetchStatus = 'failed'
  else if (errors.length) fetchStatus = 'partial'

  return upsertStudentCodingSnapshot({
    studentProfileId: student.id,
    handles,
    cards,
    fetchStatus,
    fetchError: errors.length ? errors.join('; ') : null,
  })
}

export async function ensureStudentCodingProfile(
  student: Pick<StudentProfileRow, 'id' | 'github_url' | 'platform_handles'>,
  options?: { force?: boolean },
): Promise<StudentCodingSnapshotRow> {
  const handles = normalizeHandles(resolvePlatformHandles(student))
  const existing = await getStudentCodingSnapshot(student.id)
  if (!options?.force && existing && !snapshotNeedsRefresh(existing, handles)) {
    return existing
  }
  return syncStudentCodingProfile(student)
}

export function studentUsernamesFromProfile(
  student: Pick<StudentProfileRow, 'github_url' | 'platform_handles'>,
) {
  return platformHandlesToUsernames(resolvePlatformHandles(student))
}
