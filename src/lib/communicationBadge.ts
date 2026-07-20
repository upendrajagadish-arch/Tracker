/** Communication performance badges (Gold / Silver / Bronze / Poor). Score is out of 250. */

export const COMMUNICATION_MAX_SCORE = 250

/** Fixed score thresholds — easy to change for future admin config. */
export const COMMUNICATION_BADGE_THRESHOLDS = {
  gold: { min: 200, max: 250 },
  silver: { min: 150, max: 199 },
  bronze: { min: 100, max: 149 },
  poor: { min: 0, max: 99 },
} as const

export type CommunicationBadge = keyof typeof COMMUNICATION_BADGE_THRESHOLDS

export const COMMUNICATION_BADGE_ORDER: CommunicationBadge[] = ['gold', 'silver', 'bronze', 'poor']

export const COMMUNICATION_BADGE_LABELS: Record<CommunicationBadge, string> = {
  gold: 'Gold',
  silver: 'Silver',
  bronze: 'Bronze',
  poor: 'Poor',
}

export const COMMUNICATION_BADGE_EMOJI: Record<CommunicationBadge, string> = {
  gold: '🥇',
  silver: '🥈',
  bronze: '🥉',
  poor: '📉',
}

/** Academic batch dropdown values (no free text). Easy to extend. */
export const COMMUNICATION_ACADEMIC_BATCH_OPTIONS = [
  '2023-2027',
  '2024-2028',
  '2025-2029',
  '2026-2030',
  '2027-2031',
] as const

/** Branch dropdown values. Easy to extend. */
export const COMMUNICATION_BRANCH_OPTIONS = [
  'CSE',
  'CSE-AI',
  'AI&DS',
  'AI&ML',
  'IT',
  'ECE',
  'EEE',
  'MECH',
  'CIVIL',
] as const

export function isCommunicationBadge(value: string): value is CommunicationBadge {
  return value === 'gold' || value === 'silver' || value === 'bronze' || value === 'poor'
}

/** Classify a raw communication total score (0–250). */
export function classifyCommunicationBadge(totalScore: number | null | undefined): CommunicationBadge | null {
  if (totalScore == null || Number.isNaN(Number(totalScore))) return null
  const score = Number(totalScore)
  if (score < 0 || score > COMMUNICATION_MAX_SCORE) return null

  const { gold, silver, bronze, poor } = COMMUNICATION_BADGE_THRESHOLDS
  if (score >= gold.min && score <= gold.max) return 'gold'
  if (score >= silver.min && score <= silver.max) return 'silver'
  if (score >= bronze.min && score <= bronze.max) return 'bronze'
  if (score >= poor.min && score <= poor.max) return 'poor'
  return null
}

/** Derive total score from percentage when only percentage is available. */
export function totalScoreFromPercentage(percentage: number | null | undefined): number | null {
  if (percentage == null || Number.isNaN(Number(percentage))) return null
  return Math.round((Number(percentage) / 100) * COMMUNICATION_MAX_SCORE)
}

export function formatCommunicationBadge(badge: CommunicationBadge | null | undefined): string {
  if (!badge) return '—'
  return `${COMMUNICATION_BADGE_EMOJI[badge]} ${COMMUNICATION_BADGE_LABELS[badge]}`
}

export function communicationBadgePercent(count: number, total: number): number {
  if (!total) return 0
  return Math.round((count / total) * 100)
}

export interface CommunicationBadgeCsvRow {
  rollNumber: string
  fullName: string
  branch: string
  academicBatch: string
  totalScore: number
  percentage: number
  grade: string
  badge: CommunicationBadge
}

export function badgeStudentsToCsv(rows: CommunicationBadgeCsvRow[]): string {
  const escape = (value: unknown) => {
    const raw = String(value ?? '')
    const s = /^[=+\-@]/.test(raw) ? `'${raw}` : raw
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const header = [
    'Roll Number',
    'Name',
    'Branch',
    'Academic Batch',
    'Communication Score',
    'Percentage',
    'Grade',
    'Badge',
  ]
  const lines = [header.join(',')]
  for (const row of rows) {
    lines.push(
      [
        escape(row.rollNumber),
        escape(row.fullName),
        escape(row.branch),
        escape(row.academicBatch),
        row.totalScore,
        row.percentage,
        escape(row.grade),
        escape(row.badge),
      ].join(','),
    )
  }
  return lines.join('\n')
}
