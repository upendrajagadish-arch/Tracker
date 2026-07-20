/** Tech Stack performance badges (Gold / Silver / Bronze / Poor). Score is 0–100. */

export const TECH_STACK_BADGE_THRESHOLDS = {
  gold: { min: 80, max: 100 },
  silver: { min: 60, max: 79 },
  bronze: { min: 40, max: 59 },
  poor: { min: 0, max: 39 },
} as const

export type TechStackBadge = keyof typeof TECH_STACK_BADGE_THRESHOLDS

export const TECH_STACK_BADGE_ORDER: TechStackBadge[] = ['gold', 'silver', 'bronze', 'poor']

export const TECH_STACK_BADGE_LABELS: Record<TechStackBadge, string> = {
  gold: 'Gold',
  silver: 'Silver',
  bronze: 'Bronze',
  poor: 'Poor',
}

export const TECH_STACK_BADGE_EMOJI: Record<TechStackBadge, string> = {
  gold: '🥇',
  silver: '🥈',
  bronze: '🥉',
  poor: '📉',
}

export function isTechStackBadge(value: string): value is TechStackBadge {
  return value === 'gold' || value === 'silver' || value === 'bronze' || value === 'poor'
}

export function scoreFromProficiency(level: string | null | undefined): number {
  switch (String(level ?? '').toUpperCase()) {
    case 'ADVANCED':
    case 'EXPERT':
      return 90
    case 'INTERMEDIATE':
      return 65
    case 'BEGINNER':
      return 35
    default:
      return 20
  }
}

/** Average proficiency score across declared skills (0 when none). */
export function computeTechStackScore(
  skills: Array<{ proficiency_level?: string | null }>,
): number {
  if (!skills.length) return 0
  const total = skills.reduce((sum, skill) => sum + scoreFromProficiency(skill.proficiency_level), 0)
  return Math.round(total / skills.length)
}

export function classifyTechStackBadge(score: number | null | undefined): TechStackBadge | null {
  if (score == null || Number.isNaN(Number(score))) return null
  const value = Math.max(0, Math.min(100, Number(score)))
  const { gold, silver, bronze, poor } = TECH_STACK_BADGE_THRESHOLDS
  if (value >= gold.min) return 'gold'
  if (value >= silver.min) return 'silver'
  if (value >= bronze.min) return 'bronze'
  if (value >= poor.min) return 'poor'
  return null
}

export function classifyTechStackBadgeFromSkills(
  skills: Array<{ proficiency_level?: string | null }>,
): TechStackBadge {
  return classifyTechStackBadge(computeTechStackScore(skills)) ?? 'poor'
}

export function formatTechStackBadge(badge: TechStackBadge | null | undefined): string {
  if (!badge) return '—'
  return `${TECH_STACK_BADGE_EMOJI[badge]} ${TECH_STACK_BADGE_LABELS[badge]}`
}

export function techStackBadgePercent(count: number, total: number): number {
  if (!total) return 0
  return Math.round((count / total) * 100)
}

export type BadgeCountMap = Record<TechStackBadge, number>

export function emptyBadgeCounts(): BadgeCountMap {
  return { gold: 0, silver: 0, bronze: 0, poor: 0 }
}

export function tallyBadge(counts: BadgeCountMap, badge: TechStackBadge | null | undefined) {
  if (!badge) return
  counts[badge] += 1
}
