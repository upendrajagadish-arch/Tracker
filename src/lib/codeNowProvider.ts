/**
 * CodeNow provider abstraction.
 * Endpoints are not hardcoded; when API is disabled/unset, returns CODENOW_NOT_CONFIGURED.
 * Prefer manual/CSV import until a real API contract is configured.
 */

import {
  assertCodeNowConfigured,
  CODENOW_NOT_CONFIGURED,
  getCodeNowBaseUrl,
  getCodeNowHeaders,
  getCodeNowTimeout,
  isCodeNowEnabled,
} from '@/lib/codeNowConfig'
import {
  formatCodeNowTotals,
  normalizeCodeNowCategory,
  normalizeCodeNowStatus,
  type CodeNowCategory,
  type CodeNowChallengeStatus,
} from '@/lib/codeNowCategories'

export { CODENOW_NOT_CONFIGURED }

export interface CodeNowStudentLookup {
  rollNumber?: string
  email?: string
  codeNowUsername?: string
}

export interface NormalizedCodeNowProfile {
  username: string | null
  email: string | null
  totalScore: number | null
  maxScore: number | null
  percentage: number | null
  grade: string | null
  rank: number | null
  totalChallenges: number | null
  solvedChallenges: number | null
}

export interface NormalizedCodeNowChallenge {
  challengeId: string | null
  challengeName: string
  category: CodeNowCategory
  score: number
  maxScore: number
  percentage: number
  status: CodeNowChallengeStatus
  attemptedAt: string | null
  rawReferenceId: string | null
}

async function fetchJson(path: string, query: Record<string, string | undefined>) {
  assertCodeNowConfigured()
  const base = getCodeNowBaseUrl()
  const url = new URL(path.replace(/^\//, ''), `${base}/`)
  for (const [key, value] of Object.entries(query)) {
    if (value) url.searchParams.set(key, value)
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), getCodeNowTimeout())
  try {
    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: getCodeNowHeaders(),
      signal: controller.signal,
    })
    if (!res.ok) {
      throw new Error(`CodeNow API error: HTTP ${res.status}`)
    }
    return (await res.json()) as unknown
  } finally {
    clearTimeout(timer)
  }
}

export async function testCodeNowConnection(): Promise<{ ok: boolean; message: string }> {
  if (!isCodeNowEnabled()) {
    return { ok: false, message: CODENOW_NOT_CONFIGURED }
  }
  try {
    // Optional health probe — path is configurable via base URL only; no assumed contract.
    await fetchJson('health', {})
    return { ok: true, message: 'CodeNow health endpoint responded' }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Connection failed'
    if (message === CODENOW_NOT_CONFIGURED) return { ok: false, message }
    return { ok: false, message }
  }
}

export function normalizeCodeNowProfile(raw: unknown): NormalizedCodeNowProfile {
  const data = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const nested =
    data.profile && typeof data.profile === 'object'
      ? (data.profile as Record<string, unknown>)
      : data

  const score = nested.total_score ?? nested.totalScore ?? nested.score
  const maxScore = nested.max_score ?? nested.maxScore ?? nested.outof
  let percentage: number | null =
    nested.percentage == null ? null : Number(nested.percentage)
  let grade: string | null = nested.grade == null ? null : String(nested.grade)

  if (score != null && maxScore != null && !Number.isNaN(Number(score)) && Number(maxScore) > 0) {
    try {
      const totals = formatCodeNowTotals({ score: Number(score), maxScore: Number(maxScore) })
      percentage = totals.percentage
      grade = totals.grade
    } catch {
      // keep provided percentage/grade if totals invalid
    }
  }

  return {
    username: nested.username || nested.codenow_username || nested.handle
      ? String(nested.username ?? nested.codenow_username ?? nested.handle)
      : null,
    email: nested.email ? String(nested.email) : null,
    totalScore: score == null ? null : Number(score),
    maxScore: maxScore == null ? null : Number(maxScore),
    percentage,
    grade,
    rank: nested.rank == null ? null : Number(nested.rank),
    totalChallenges:
      nested.total_challenges == null && nested.totalChallenges == null
        ? null
        : Number(nested.total_challenges ?? nested.totalChallenges),
    solvedChallenges:
      nested.solved_challenges == null && nested.solvedChallenges == null
        ? null
        : Number(nested.solved_challenges ?? nested.solvedChallenges),
  }
}

export function normalizeCodeNowChallenges(raw: unknown): NormalizedCodeNowChallenge[] {
  const list = Array.isArray(raw)
    ? raw
    : raw && typeof raw === 'object' && Array.isArray((raw as { challenges?: unknown }).challenges)
      ? ((raw as { challenges: unknown[] }).challenges)
      : raw && typeof raw === 'object' && Array.isArray((raw as { data?: unknown }).data)
        ? ((raw as { data: unknown[] }).data)
        : []

  const out: NormalizedCodeNowChallenge[] = []
  for (const item of list) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const category = normalizeCodeNowCategory(row.category ?? row.challenge_category ?? 'other')
    const score = Number(row.score ?? row.marks ?? 0)
    const maxScore = Number(row.max_score ?? row.maxScore ?? row.outof ?? 100)
    if (!category || Number.isNaN(score) || Number.isNaN(maxScore) || maxScore <= 0) continue
    if (score < 0 || score > maxScore) continue
    const totals = formatCodeNowTotals({ score, maxScore })
    out.push({
      challengeId: row.challenge_id || row.challengeId || row.id
        ? String(row.challenge_id ?? row.challengeId ?? row.id)
        : null,
      challengeName: String(row.challenge_name ?? row.challengeName ?? row.name ?? 'Challenge'),
      category,
      score: totals.score,
      maxScore: totals.max_score,
      percentage: totals.percentage,
      status: normalizeCodeNowStatus(row.status),
      attemptedAt: row.attempted_at || row.attemptedAt || row.date
        ? String(row.attempted_at ?? row.attemptedAt ?? row.date)
        : null,
      rawReferenceId: row.reference_id || row.raw_reference_id
        ? String(row.reference_id ?? row.raw_reference_id)
        : null,
    })
  }
  return out
}

export async function fetchCodeNowStudentProfile(
  lookup: CodeNowStudentLookup,
): Promise<NormalizedCodeNowProfile> {
  if (!isCodeNowEnabled()) throw new Error(CODENOW_NOT_CONFIGURED)
  const raw = await fetchJson('students/profile', {
    rollNumber: lookup.rollNumber,
    email: lookup.email,
    username: lookup.codeNowUsername,
  })
  return normalizeCodeNowProfile(raw)
}

export async function fetchCodeNowChallengeScores(
  lookup: CodeNowStudentLookup,
): Promise<NormalizedCodeNowChallenge[]> {
  if (!isCodeNowEnabled()) throw new Error(CODENOW_NOT_CONFIGURED)
  const raw = await fetchJson('students/challenges', {
    rollNumber: lookup.rollNumber,
    email: lookup.email,
    username: lookup.codeNowUsername,
  })
  return normalizeCodeNowChallenges(raw)
}
