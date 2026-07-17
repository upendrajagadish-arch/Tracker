/** Client-side helpers for Hall of Fame gamification levels / XP bars. */

export const FAME_LEVELS = [
  { name: 'Rookie', minXp: 0, color: '#929AA5' },
  { name: 'Contender', minXp: 400, color: '#3B82F6' },
  { name: 'Challenger', minXp: 550, color: '#A78BFA' },
  { name: 'Elite', minXp: 700, color: '#0ECB81' },
  { name: 'Legend', minXp: 850, color: '#F0B90B' },
  { name: 'Hall of Fame', minXp: 950, color: '#D27918' },
] as const

export type FameLevelName = (typeof FAME_LEVELS)[number]['name']

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
