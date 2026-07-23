import { requireSupabase } from '@/lib/supabase'
import {
  codingScoreFromSolved,
  compareLeaderboardByFame,
  computeFameXp,
  computeParameterAverage,
  fameLevelFromXp,
} from '@/lib/leaderboardFame'
import { resolveStudentGraduationYear } from '@/lib/trainingPrograms'

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
  /** Unweighted average of all parameters (0–100) for display. */
  avgScore: number
  /** Tech stack proficiency average (0–100). */
  techStackScore: number
  /** Coding problems band (0–100 from total solved). */
  codingScore: number
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
  return resolveStudentGraduationYear({
    graduation_year:
      raw.graduationYear != null && Number.isFinite(Number(raw.graduationYear))
        ? Number(raw.graduationYear)
        : null,
    academic_batch: raw.academicBatch == null ? null : String(raw.academicBatch),
    batch: raw.batch == null ? null : String(raw.batch),
    roll_number: raw.rollNumber == null ? null : String(raw.rollNumber),
  })
}

function toRow(raw: Record<string, unknown>): LeaderboardRow {
  const communicationScore = raw.communicationScore == null ? null : Number(raw.communicationScore)
  const aptitudeScore = raw.aptitudeScore == null ? null : Number(raw.aptitudeScore)
  const verbalScore = raw.verbalScore == null ? null : Number(raw.verbalScore)
  const codeNowScore = raw.codeNowScore == null ? null : Number(raw.codeNowScore)
  const readinessScore = Number(raw.readinessScore ?? 0)
  const totalSolved = Number(raw.totalSolved ?? 0)
  const techStackScore =
    raw.techStackScore == null || !Number.isFinite(Number(raw.techStackScore))
      ? 0
      : Number(raw.techStackScore)
  const codingScore =
    raw.codingScore == null || !Number.isFinite(Number(raw.codingScore))
      ? Math.round(codingScoreFromSolved(totalSolved))
      : Number(raw.codingScore)

  const scoreInput = {
    communicationScore,
    aptitudeScore,
    verbalScore,
    codeNowScore,
    readinessScore,
    techStackScore,
    totalSolved,
  }

  const fameXp = computeFameXp(scoreInput)
  const fameLevel =
    raw.fameLevel == null || raw.fameLevel === ''
      ? fameLevelFromXp(fameXp).name
      : String(raw.fameLevel)

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
    readinessScore: Number.isFinite(readinessScore) ? readinessScore : 0,
    readinessStatus: String(raw.readinessStatus ?? ''),
    placementStatus: String(raw.placementStatus ?? ''),
    communicationScore,
    communicationGrade: raw.communicationGrade == null ? null : String(raw.communicationGrade),
    avgScore: computeParameterAverage(scoreInput),
    techStackScore,
    codingScore,
    aptitudeScore,
    aptitudeGrade: raw.aptitudeGrade == null ? null : String(raw.aptitudeGrade),
    verbalScore,
    verbalGrade: raw.verbalGrade == null ? null : String(raw.verbalGrade),
    codeNowScore,
    codeNowGrade: raw.codeNowGrade == null ? null : String(raw.codeNowGrade),
    cgpa: raw.cgpa == null ? null : Number(raw.cgpa),
    totalSolved,
    linkedCount: Number(raw.linkedCount ?? 0),
    shareToken: raw.shareToken == null ? null : String(raw.shareToken),
  }
}

function rankRows(rows: LeaderboardRow[]): LeaderboardRow[] {
  return [...rows]
    .sort(compareLeaderboardByFame)
    .map((row, index) => ({ ...row, rank: index + 1 }))
}

/** Open (anonymous) Leaderboard — year-wise ranks; includes students with score 0. */
export async function getPublicLeaderboard(options: {
  search?: string
  year?: number | null
  limit?: number
  offset?: number
} = {}): Promise<LeaderboardResult> {
  const client = requireSupabase()
  const offset = options.offset ?? 0
  const payloadArgs: Record<string, unknown> = {
    p_search: options.search?.trim() || null,
    p_limit: options.limit ?? 200,
    p_offset: offset,
  }
  if (options.year != null) payloadArgs.p_year = options.year

  let data: unknown
  let error: { message?: string } | null = null
  ;({ data, error } = await client.rpc('get_public_leaderboard', payloadArgs))
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
  const usedClientYearFilter = options.year != null && !serverFilteredByYear

  if (usedClientYearFilter) {
    rows = rankRows(rows.filter((row) => row.graduationYear === options.year))
  } else if (offset === 0) {
    rows = rankRows(rows)
  } else {
    rows = [...rows].sort(compareLeaderboardByFame)
  }

  return {
    total: usedClientYearFilter ? rows.length : Number(payload.total ?? rows.length),
    limit: Number(payload.limit ?? options.limit ?? 200),
    offset: Number(payload.offset ?? offset),
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
