import { requireSupabase } from '@/lib/supabase'
import { fameLevelFromXp } from '@/lib/leaderboardFame'

export interface LeaderboardRow {
  rank: number
  rollNumber: string
  fullName: string
  branch: string
  batch: string
  academicBatch: string | null
  graduationYear: number | null
  fameXp: number
  fameLevel: string
  readinessScore: number
  readinessStatus: string
  placementStatus: string
  communicationScore: number | null
  communicationGrade: string | null
  avgScore: number
  aptitudeScore: number | null
  aptitudeGrade: string | null
  verbalScore: number | null
  verbalGrade: string | null
  codeNowScore: number | null
  codeNowGrade: string | null
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

function resolveGraduationYear(raw: Record<string, unknown>): number | null {
  if (raw.graduationYear != null && Number.isFinite(Number(raw.graduationYear))) {
    return Number(raw.graduationYear)
  }
  const academic = String(raw.academicBatch ?? raw.batch ?? '').trim()
  const range = academic.match(/(\d{4})\s*$/)
  if (range) return Number(range[1])
  return null
}

function toRow(raw: Record<string, unknown>): LeaderboardRow {
  const fameXp = Number(raw.fameXp ?? raw.readinessScore ?? 0)
  const fameLevel =
    raw.fameLevel == null || raw.fameLevel === ''
      ? fameLevelFromXp(fameXp).name
      : String(raw.fameLevel)
  const communicationScore = raw.communicationScore == null ? null : Number(raw.communicationScore)
  const readinessScore = Number(raw.readinessScore ?? 0)
  const techStackScore = Number.isFinite(readinessScore) ? readinessScore : 0
  const codingSolved = Number(raw.totalSolved ?? 0)
  const codingScore = Math.min(100, codingSolved)
  const avgScore = Math.round(
    ((communicationScore ?? 0) + techStackScore + codingScore) / 3,
  )

  return {
    rank: Number(raw.rank ?? 0),
    rollNumber: String(raw.rollNumber ?? ''),
    fullName: String(raw.fullName ?? ''),
    branch: String(raw.branch ?? ''),
    batch: String(raw.batch ?? ''),
    academicBatch: raw.academicBatch == null ? null : String(raw.academicBatch),
    graduationYear: resolveGraduationYear(raw),
    fameXp,
    fameLevel,
    readinessScore,
    readinessStatus: String(raw.readinessStatus ?? ''),
    placementStatus: String(raw.placementStatus ?? ''),
    communicationScore,
    communicationGrade: raw.communicationGrade == null ? null : String(raw.communicationGrade),
    avgScore,
    aptitudeScore: raw.aptitudeScore == null ? null : Number(raw.aptitudeScore),
    aptitudeGrade: raw.aptitudeGrade == null ? null : String(raw.aptitudeGrade),
    verbalScore: raw.verbalScore == null ? null : Number(raw.verbalScore),
    verbalGrade: raw.verbalGrade == null ? null : String(raw.verbalGrade),
    codeNowScore: raw.codeNowScore == null ? null : Number(raw.codeNowScore),
    codeNowGrade: raw.codeNowGrade == null ? null : String(raw.codeNowGrade),
    cgpa: raw.cgpa == null ? null : Number(raw.cgpa),
    totalSolved: Number(raw.totalSolved ?? 0),
    linkedCount: Number(raw.linkedCount ?? 0),
    shareToken: raw.shareToken == null ? null : String(raw.shareToken),
  }
}

/** Open (anonymous) Leaderboard — year-wise ranks; includes students with score 0. */
export async function getPublicLeaderboard(options: {
  search?: string
  year?: number | null
  limit?: number
  offset?: number
} = {}): Promise<LeaderboardResult> {
  const client = requireSupabase()
  const payloadArgs: Record<string, unknown> = {
    p_search: options.search?.trim() || null,
    p_limit: options.limit ?? 200,
    p_offset: options.offset ?? 0,
  }
  if (options.year != null) payloadArgs.p_year = options.year

  let data: unknown
  let error: { message?: string } | null = null
  ;({ data, error } = await client.rpc('get_public_leaderboard', payloadArgs))
  // Older DB overloads may not accept p_year — retry without it and filter client-side.
  if (error && options.year != null && /p_year|could not find|function/i.test(error.message ?? '')) {
    ;({ data, error } = await client.rpc('get_public_leaderboard', {
      p_search: options.search?.trim() || null,
      p_limit: Math.max(options.limit ?? 200, 500),
      p_offset: 0,
    }))
  }
  if (error) throw error

  const payload = (data ?? {}) as Record<string, unknown>
  const rawRows = Array.isArray(payload.rows) ? (payload.rows as Array<Record<string, unknown>>) : []
  let rows = rawRows.map(toRow)
  const serverFilteredByYear = options.year != null && payload.year != null

  if (options.year != null && !serverFilteredByYear) {
    rows = rows.filter((row) => row.graduationYear === options.year)
    rows = rows
      .sort((a, b) => {
        const avgDiff = (b.avgScore ?? 0) - (a.avgScore ?? 0)
        if (avgDiff !== 0) return avgDiff
        return a.rollNumber.localeCompare(b.rollNumber, undefined, { numeric: true })
      })
      .map((row, index) => ({ ...row, rank: index + 1 }))
  }

  return {
    total: options.year != null && !serverFilteredByYear ? rows.length : Number(payload.total ?? rows.length),
    limit: Number(payload.limit ?? options.limit ?? 200),
    offset: Number(payload.offset ?? options.offset ?? 0),
    generatedAt: payload.generatedAt == null ? null : String(payload.generatedAt),
    rows,
  }
}

/** Playful funny-mode avatar derived from the roll number. */
export function leaderboardAvatarUrl(rollNumber: string): string {
  const seed = encodeURIComponent(rollNumber.trim().toUpperCase() || 'student')
  const backgrounds = ['1e2329', '2b1d12', '14261c', '1a2030', '2a1f2e', '231a12']
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  const bg = backgrounds[hash % backgrounds.length]
  return `https://api.dicebear.com/9.x/fun-emoji/svg?seed=${seed}&radius=50&backgroundColor=${bg}&scale=90`
}
