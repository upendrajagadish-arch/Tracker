import type { GFGData, GFGHeatmapData, GFGProfileData } from '../types/api'
import type { UnifiedHeatmap, UnifiedStats } from '../types/unified'
import { fetchCard } from './cards'
import { asNumber, fetchUnifiedEnvelope, windowUnifiedHeatmap } from './unifiedClient'

export async function fetchGFGStats(username: string): Promise<GFGData> {
  const envelope = await fetchUnifiedEnvelope<UnifiedStats>('gfg', username, 'stats')
  const difficulty = envelope.data.byDifficulty ?? {}
  return {
    totalProblemsSolved: envelope.data.totalSolved,
    School: asNumber(difficulty.school),
    Basic: asNumber(difficulty.basic),
    Easy: asNumber(difficulty.easy),
    Medium: asNumber(difficulty.medium),
    Hard: asNumber(difficulty.hard),
  }
}

export async function fetchGFGProfile(username: string): Promise<GFGProfileData> {
  const card = await fetchCard('gfg', username)
  return {
    userName: card.profile.username ?? card.username ?? username,
    profilePicture: card.profile.avatar ?? '',
    institute: card.profile.institution ?? '',
    instituteRank: 0,
    currentStreak: card.heatmap.currentStreak,
    maxStreak: card.heatmap.longestStreak,
    codingScore: 0,
    monthlyScore: 0,
    totalProblemsSolved: card.stats.totalSolved,
  }
}

export async function fetchGFGHeatmap(
  username: string,
  options: { view?: 'all' | 'last_365' | 'year'; year?: number | null } = {},
): Promise<GFGHeatmapData> {
  const envelope = await fetchUnifiedEnvelope<UnifiedHeatmap>('gfg', username, 'heatmap', {
    view: options.view,
    year: options.year,
  })
  const heatmap = windowUnifiedHeatmap(envelope.data, options)

  return {
    userName: envelope.username ?? username,
    range: options.view ?? 'all',
    accountCreatedDate: heatmap.firstActiveDate ?? '',
    fromDate: heatmap.startDate,
    toDate: heatmap.endDate,
    availableYears: heatmap.availableYears,
    totalActiveDays: heatmap.totalActiveDays,
    totalSubmissions: heatmap.totalSubmissions,
    heatmap: heatmap.dailyContributions.map((day) => ({ date: day.date, count: day.count })),
  }
}
