/** Client-side helpers for Hall of Fame gamification levels / XP bars.
 * Fame XP formula must stay in sync with `get_public_leaderboard` SQL.
 */

export const FAME_LEVELS = [
  { name: 'Rookie', minXp: 0, color: '#929AA5' },
  { name: 'Contender', minXp: 400, color: '#3B82F6' },
  { name: 'Challenger', minXp: 550, color: '#A78BFA' },
  { name: 'Elite', minXp: 700, color: '#0ECB81' },
  { name: 'Legend', minXp: 850, color: '#F0B90B' },
  { name: 'Hall of Fame', minXp: 950, color: '#D27918' },
] as const

export type FameLevelName = (typeof FAME_LEVELS)[number]['name']

/**
 * Priority weights (sum = 1):
 * Higher — coding, CodeNow, tech stack
 * Then — communication, aptitude, verbal
 * Plus readiness
 */
export const FAME_XP_WEIGHTS = {
  coding: 0.2,
  codeNow: 0.18,
  techStack: 0.18,
  readiness: 0.12,
  communication: 0.12,
  aptitude: 0.1,
  verbal: 0.1,
} as const

/** Inputs mirror student_profiles + coding snapshot + tech skills. */
export interface FameXpInput {
  communicationScore?: number | null
  aptitudeScore?: number | null
  verbalScore?: number | null
  codeNowScore?: number | null
  readinessScore?: number | null
  techStackScore?: number | null
  totalSolved?: number | null
}

/** Coding problems → 0–100 band (300 solved ≈ 100). Matches SQL. */
export function codingScoreFromSolved(totalSolved: number | null | undefined): number {
  return Math.min(100, (Number(totalSolved) || 0) / 3)
}

export function normalizeScore(value: number | null | undefined): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(100, n))
}

/**
 * Unweighted average of all leaderboard parameters (0–100) for display.
 * Comm · Tech · Coding · CodeNow · Aptitude · Verbal · Readiness
 */
export function computeParameterAverage(input: FameXpInput): number {
  const communication = normalizeScore(input.communicationScore)
  const aptitude = normalizeScore(input.aptitudeScore)
  const verbal = normalizeScore(input.verbalScore)
  const codeNow = normalizeScore(input.codeNowScore)
  const readiness = normalizeScore(input.readinessScore)
  const techStack = normalizeScore(input.techStackScore)
  const coding = codingScoreFromSolved(input.totalSolved)
  return Math.round(
    (communication + aptitude + verbal + codeNow + readiness + techStack + coding) / 7,
  )
}

/**
 * Weighted Fame XP (0–1000):
 * coding×0.20 + CodeNow×0.18 + tech×0.18 + readiness×0.12
 * + comm×0.12 + aptitude×0.10 + verbal×0.10
 */
export function computeFameXp(input: FameXpInput): number {
  const communication = normalizeScore(input.communicationScore)
  const aptitude = normalizeScore(input.aptitudeScore)
  const verbal = normalizeScore(input.verbalScore)
  const codeNow = normalizeScore(input.codeNowScore)
  const readiness = normalizeScore(input.readinessScore)
  const techStack = normalizeScore(input.techStackScore)
  const coding = codingScoreFromSolved(input.totalSolved)
  const weighted =
    coding * FAME_XP_WEIGHTS.coding +
    codeNow * FAME_XP_WEIGHTS.codeNow +
    techStack * FAME_XP_WEIGHTS.techStack +
    readiness * FAME_XP_WEIGHTS.readiness +
    communication * FAME_XP_WEIGHTS.communication +
    aptitude * FAME_XP_WEIGHTS.aptitude +
    verbal * FAME_XP_WEIGHTS.verbal
  return Math.max(0, Math.min(1000, Math.round(weighted * 10)))
}

/** 0–100 view of Fame XP (fameXp / 10). */
export function fameXpToPercent(fameXp: number): number {
  return Math.max(0, Math.min(100, Math.round(Number(fameXp) / 10)))
}

export function compareLeaderboardByFame(
  a: {
    fameXp: number
    techStackScore?: number | null
    codeNowScore?: number | null
    totalSolved?: number
    readinessScore?: number
    communicationScore?: number | null
    cgpa?: number | null
    rollNumber: string
  },
  b: {
    fameXp: number
    techStackScore?: number | null
    codeNowScore?: number | null
    totalSolved?: number
    readinessScore?: number
    communicationScore?: number | null
    cgpa?: number | null
    rollNumber: string
  },
): number {
  const fameDiff = (b.fameXp ?? 0) - (a.fameXp ?? 0)
  if (fameDiff !== 0) return fameDiff
  const codingDiff = codingScoreFromSolved(b.totalSolved) - codingScoreFromSolved(a.totalSolved)
  if (codingDiff !== 0) return codingDiff
  const codeNowDiff = (b.codeNowScore ?? 0) - (a.codeNowScore ?? 0)
  if (codeNowDiff !== 0) return codeNowDiff
  const techDiff = (b.techStackScore ?? 0) - (a.techStackScore ?? 0)
  if (techDiff !== 0) return techDiff
  const readyDiff = (b.readinessScore ?? 0) - (a.readinessScore ?? 0)
  if (readyDiff !== 0) return readyDiff
  const commDiff = (b.communicationScore ?? 0) - (a.communicationScore ?? 0)
  if (commDiff !== 0) return commDiff
  const cgpaDiff = (b.cgpa ?? 0) - (a.cgpa ?? 0)
  if (cgpaDiff !== 0) return cgpaDiff
  return a.rollNumber.localeCompare(b.rollNumber, undefined, { numeric: true })
}

export function fameLevelFromXp(xp: number): (typeof FAME_LEVELS)[number] {
  for (let i = FAME_LEVELS.length - 1; i >= 0; i -= 1) {
    if (xp >= FAME_LEVELS[i]!.minXp) return FAME_LEVELS[i]!
  }
  return FAME_LEVELS[0]!
}

/** Progress within current level toward the next (0–100). */
export function fameLevelProgress(xp: number): { current: number; next: number | null; percent: number } {
  const level = fameLevelFromXp(xp)
  const idx = FAME_LEVELS.findIndex((l) => l.name === level.name)
  const next = FAME_LEVELS[idx + 1] ?? null
  if (!next) return { current: level.minXp, next: null, percent: 100 }
  const span = next.minXp - level.minXp
  const gained = Math.max(0, xp - level.minXp)
  return {
    current: level.minXp,
    next: next.minXp,
    percent: Math.min(100, Math.round((gained / span) * 100)),
  }
}
