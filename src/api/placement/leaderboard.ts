import { requireSupabase } from '@/lib/supabase'

export interface LeaderboardRow {
  rank: number
  rollNumber: string
  fullName: string
  branch: string
  batch: string
  academicBatch: string | null
  readinessScore: number
  readinessStatus: string
  placementStatus: string
  communicationScore: number | null
  communicationGrade: string | null
  cgpa: number | null
  totalSolved: number
  linkedCount: number
  shareToken: string | null
}

export interface LeaderboardResult {
  total: number
  limit: number
  offset: number
  generatedAt: string | null
  rows: LeaderboardRow[]
}

function toRow(raw: Record<string, unknown>): LeaderboardRow {
  return {
    rank: Number(raw.rank ?? 0),
    rollNumber: String(raw.rollNumber ?? ''),
    fullName: String(raw.fullName ?? ''),
    branch: String(raw.branch ?? ''),
    batch: String(raw.batch ?? ''),
    academicBatch: raw.academicBatch == null ? null : String(raw.academicBatch),
    readinessScore: Number(raw.readinessScore ?? 0),
    readinessStatus: String(raw.readinessStatus ?? ''),
    placementStatus: String(raw.placementStatus ?? ''),
    communicationScore: raw.communicationScore == null ? null : Number(raw.communicationScore),
    communicationGrade: raw.communicationGrade == null ? null : String(raw.communicationGrade),
    cgpa: raw.cgpa == null ? null : Number(raw.cgpa),
    totalSolved: Number(raw.totalSolved ?? 0),
    linkedCount: Number(raw.linkedCount ?? 0),
    shareToken: raw.shareToken == null ? null : String(raw.shareToken),
  }
}

/** Open (anonymous) leaderboard of top performers, ranked by readiness score. */
export async function getPublicLeaderboard(options: {
  search?: string
  limit?: number
  offset?: number
} = {}): Promise<LeaderboardResult> {
  const client = requireSupabase()
  const { data, error } = await client.rpc('get_public_leaderboard', {
    p_search: options.search?.trim() || null,
    p_limit: options.limit ?? 100,
    p_offset: options.offset ?? 0,
  })
  if (error) throw error

  const payload = (data ?? {}) as Record<string, unknown>
  const rawRows = Array.isArray(payload.rows) ? (payload.rows as Array<Record<string, unknown>>) : []

  return {
    total: Number(payload.total ?? 0),
    limit: Number(payload.limit ?? options.limit ?? 100),
    offset: Number(payload.offset ?? options.offset ?? 0),
    generatedAt: payload.generatedAt == null ? null : String(payload.generatedAt),
    rows: rawRows.map(toRow),
  }
}

/** Playful pixel-character avatar derived from the roll number. */
export function leaderboardAvatarUrl(rollNumber: string): string {
  const seed = encodeURIComponent(rollNumber.trim().toUpperCase() || 'student')
  return `https://api.dicebear.com/9.x/adventurer-neutral/svg?seed=${seed}&radius=50&backgroundColor=1e2329`
}
