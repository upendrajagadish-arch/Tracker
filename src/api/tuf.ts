import type { UnifiedCard, UnifiedHeatmap } from '../types/unified'
import { fetchCard } from './cards'
import { fetchUnifiedEnvelope, windowUnifiedHeatmap } from './unifiedClient'

export interface TUFHeatmapData {
  userName: string
  range: string
  fromDate: string
  toDate: string
  availableYears: number[]
  totalActiveDays: number
  totalSubmissions: number
  currentStreak: number
  longestStreak: number
  heatmap: Array<{ date: string; count: number }>
}

/**
 * TUF exposes only the unified endpoints, so the detail page consumes the
 * composed card directly (profile + DSA stats + heatmap in one shape).
 */
export async function fetchTUFDetail(username: string): Promise<UnifiedCard> {
  return fetchCard('tuf', username)
}

export async function fetchTUFHeatmap(
  username: string,
  options: { view?: 'all' | 'last_365' | 'year'; year?: number | null } = {},
): Promise<TUFHeatmapData> {
  const envelope = await fetchUnifiedEnvelope<UnifiedHeatmap>('tuf', username, 'heatmap', {
    view: options.view,
    year: options.year,
  })
  const heatmap = windowUnifiedHeatmap(envelope.data, options)

  return {
    userName: envelope.username ?? username,
    range: options.view ?? 'all',
    fromDate: heatmap.startDate,
    toDate: heatmap.endDate,
    availableYears: heatmap.availableYears,
    totalActiveDays: heatmap.totalActiveDays,
    totalSubmissions: heatmap.totalSubmissions,
    currentStreak: heatmap.currentStreak,
    longestStreak: heatmap.longestStreak,
    heatmap: heatmap.dailyContributions.map((day) => ({ date: day.date, count: day.count })),
  }
}
