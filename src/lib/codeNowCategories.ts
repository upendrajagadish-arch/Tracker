/** CodeNow challenge categories + scoring helpers. */

import { calculateAssessmentGrade, clampPercentage } from '@/lib/assessmentScores'

export const CODENOW_CATEGORIES = [
  'programming',
  'debugging',
  'aptitude',
  'verbal',
  'logic',
  'data_structures',
  'algorithms',
  'sql',
  'web_development',
  'communication',
  'other',
] as const

export type CodeNowCategory = (typeof CODENOW_CATEGORIES)[number]

export const CODENOW_CATEGORY_LABELS: Record<CodeNowCategory, string> = {
  programming: 'Programming',
  debugging: 'Debugging',
  aptitude: 'Aptitude',
  verbal: 'Verbal',
  logic: 'Logic',
  data_structures: 'Data Structures',
  algorithms: 'Algorithms',
  sql: 'SQL',
  web_development: 'Web Development',
  communication: 'Communication',
  other: 'Other',
}

export function normalizeCodeNowCategory(raw: unknown): CodeNowCategory | null {
  const value = String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
  if (!value) return null
  if ((CODENOW_CATEGORIES as readonly string[]).includes(value)) {
    return value as CodeNowCategory
  }
  const aliases: Record<string, CodeNowCategory> = {
    ds: 'data_structures',
    datastructures: 'data_structures',
    algo: 'algorithms',
    algorithm: 'algorithms',
    web: 'web_development',
    webdev: 'web_development',
    programing: 'programming',
    debug: 'debugging',
  }
  return aliases[value] ?? null
}

export function formatCodeNowTotals(input: { score: number; maxScore: number }) {
  if (!(input.maxScore > 0)) throw new Error('Max score must be greater than 0')
  if (input.score < 0 || input.score > input.maxScore) {
    throw new Error('Score must be between 0 and max score')
  }
  const percentage = clampPercentage((input.score / input.maxScore) * 100)
  return {
    score: input.score,
    max_score: input.maxScore,
    percentage,
    grade: calculateAssessmentGrade(percentage),
  }
}

export type CodeNowChallengeStatus = 'solved' | 'attempted' | 'failed' | 'pending' | 'unknown'

export function normalizeCodeNowStatus(raw: unknown): CodeNowChallengeStatus {
  const value = String(raw ?? '')
    .trim()
    .toLowerCase()
  if (['solved', 'completed', 'passed', 'success'].includes(value)) return 'solved'
  if (['attempted', 'in_progress', 'partial'].includes(value)) return 'attempted'
  if (['failed', 'wrong', 'incorrect'].includes(value)) return 'failed'
  if (['pending', 'not_attempted'].includes(value)) return 'pending'
  return 'unknown'
}
