/** Overall performance summary for share / in-app display only (not readiness). */

import { clampPercentage } from '@/lib/assessmentScores'

export const OVERALL_WEIGHTS = {
  coding: 0.3,
  github: 0.2,
  communication: 0.25,
  aptitude: 0.15,
  verbal: 0.1,
} as const

export type OverallComponentKey = keyof typeof OVERALL_WEIGHTS

export function overallStatusFromScore(percentage: number | null): string {
  if (percentage == null) return 'Not Available'
  if (percentage >= 90) return 'Excellent'
  if (percentage >= 80) return 'Strong'
  if (percentage >= 70) return 'Good'
  if (percentage >= 60) return 'Average'
  if (percentage >= 50) return 'Needs Focus'
  return 'Critical'
}

/** Heuristic coding % from problems solved (display only). */
export function codingPercentFromSolved(totalSolved: number | null | undefined): number | null {
  if (totalSolved == null || Number.isNaN(Number(totalSolved)) || Number(totalSolved) <= 0) return null
  return clampPercentage(Math.min(100, Number(totalSolved) / 3))
}

/** Blend platform coding % with CodeNow % when either/both are available. */
export function blendCodingPercent(
  platformPercent: number | null | undefined,
  codeNowPercent: number | null | undefined,
): number | null {
  const platform =
    platformPercent == null || Number.isNaN(Number(platformPercent))
      ? null
      : clampPercentage(Number(platformPercent))
  const codeNow =
    codeNowPercent == null || Number.isNaN(Number(codeNowPercent))
      ? null
      : clampPercentage(Number(codeNowPercent))
  if (platform == null && codeNow == null) return null
  if (platform == null) return codeNow
  if (codeNow == null) return platform
  return clampPercentage((platform + codeNow) / 2)
}

/** Heuristic GitHub % from commit/contribution totals (display only). */
export function githubPercentFromActivity(input: {
  commits?: number | null
  repositories?: number | null
  stars?: number | null
}): number | null {
  const commits = Number(input.commits ?? 0)
  const repos = Number(input.repositories ?? 0)
  const stars = Number(input.stars ?? 0)
  if (commits <= 0 && repos <= 0 && stars <= 0) return null
  const raw = commits * 0.4 + repos * 4 + stars * 0.5
  return clampPercentage(Math.min(100, raw / 5))
}

export interface OverallPerformanceInput {
  codingPercent: number | null
  githubPercent: number | null
  communicationPercent: number | null
  aptitudePercent: number | null
  verbalPercent: number | null
}

export interface OverallPerformanceSummary {
  codingPercent: number | null
  githubPercent: number | null
  communicationPercent: number | null
  aptitudePercent: number | null
  verbalPercent: number | null
  overallPercent: number | null
  overallStatus: string
  strengths: string[]
  improvementAreas: string[]
  missingComponents: OverallComponentKey[]
  usedWeights: Partial<Record<OverallComponentKey, number>>
}

const LABELS: Record<OverallComponentKey, string> = {
  coding: 'Coding platforms',
  github: 'GitHub activity',
  communication: 'Communication',
  aptitude: 'Aptitude',
  verbal: 'Verbal',
}

export function buildOverallPerformanceSummary(
  input: OverallPerformanceInput,
): OverallPerformanceSummary {
  const values: Record<OverallComponentKey, number | null> = {
    coding: input.codingPercent,
    github: input.githubPercent,
    communication: input.communicationPercent,
    aptitude: input.aptitudePercent,
    verbal: input.verbalPercent,
  }

  const missingComponents = (Object.keys(values) as OverallComponentKey[]).filter(
    (key) => values[key] == null,
  )

  let weightSum = 0
  let weighted = 0
  const usedWeights: Partial<Record<OverallComponentKey, number>> = {}

  for (const key of Object.keys(OVERALL_WEIGHTS) as OverallComponentKey[]) {
    const value = values[key]
    if (value == null) continue
    const w = OVERALL_WEIGHTS[key]
    weightSum += w
    weighted += value * w
    usedWeights[key] = w
  }

  const overallPercent = weightSum > 0 ? clampPercentage(weighted / weightSum) : null

  const strengths: string[] = []
  const improvementAreas: string[] = []
  for (const key of Object.keys(values) as OverallComponentKey[]) {
    const value = values[key]
    if (value == null) continue
    if (value >= 75) strengths.push(LABELS[key])
    else if (value < 60) improvementAreas.push(LABELS[key])
  }

  return {
    codingPercent: values.coding,
    githubPercent: values.github,
    communicationPercent: values.communication,
    aptitudePercent: values.aptitude,
    verbalPercent: values.verbal,
    overallPercent,
    overallStatus: overallStatusFromScore(overallPercent),
    strengths,
    improvementAreas,
    missingComponents,
    usedWeights,
  }
}
