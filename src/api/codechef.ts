import type { CodeChefDetailData, CodeChefHeatmapData, CodeChefProfileData, CodeChefRatingData } from '../types/api'
import type { UnifiedHeatmap, UnifiedRating } from '../types/unified'
import { fetchCard } from './cards'
import { fetchUnifiedEnvelope, windowUnifiedHeatmap } from './unifiedClient'

function ratingColor(rating: number) {
  if (rating >= 2500) return '#ff0000'
  if (rating >= 2200) return '#ff8c00'
  if (rating >= 1800) return '#684273'
  if (rating >= 1600) return '#3366cc'
  if (rating >= 1400) return '#1e7d22'
  return '#666666'
}

export async function fetchCodeChefStats(username: string): Promise<CodeChefProfileData> {
  const card = await fetchCard('codechef', username)
  return {
    handle: card.profile.username ?? card.username ?? username,
    profile: {
      profile: card.profile.avatar,
      name: card.profile.displayName,
      currentRating: card.rating.current ?? card.contests.rating,
      highestRating: card.rating.max ?? card.contests.maxRating,
      countryFlag: card.profile.countryFlag,
      countryName: card.profile.country,
      globalRank: card.contests.globalRanking,
      countryRank: null,
      stars: card.contests.rank,
      totalSolved: card.stats.totalSolved ?? null,
      contestsCount: card.contests.count ?? null,
    },
    contestHistory: (card.contests.history ?? []).map((point) => ({
      name: point.name,
      timestamp: point.timestamp,
      rating: point.rating,
      ranking: point.ranking,
      problemsSolved: point.problemsSolved,
    })),
  }
}

export async function fetchCodeChefHeatmap(
  username: string,
  options: { view?: 'all' | 'last_365' | 'year'; year?: number | null } = {},
): Promise<CodeChefHeatmapData> {
  const envelope = await fetchUnifiedEnvelope<UnifiedHeatmap>('codechef', username, 'heatmap', {
    view: options.view,
    year: options.year,
  })
  const heatmap = windowUnifiedHeatmap(envelope.data, options)
  return {
    handle: envelope.username ?? username,
    view: options.view ?? 'all',
    year: options.year ?? null,
    availableYears: heatmap.availableYears,
    firstActiveDate: heatmap.firstActiveDate,
    lastActiveDate: heatmap.lastActiveDate,
    totalSubmissions: heatmap.totalSubmissions,
    totalActiveDays: heatmap.totalActiveDays,
    currentStreak: heatmap.currentStreak,
    longestStreak: heatmap.longestStreak,
    maxDailySubmissions: heatmap.maxDailySubmissions,
    yearlyContributions: heatmap.yearlyContributions ?? [],
    heatMap: heatmap.dailyContributions.map((day) => ({ date: day.date, value: day.count })),
  }
}

export async function fetchCodeChefRating(username: string): Promise<CodeChefRatingData> {
  const envelope = await fetchUnifiedEnvelope<UnifiedRating>('codechef', username, 'rating')
  return {
    handle: envelope.username ?? username,
    ratingData: envelope.data.history.map((point, index) => {
      const date = point.timestamp ? new Date(point.timestamp * 1000) : null
      const rating = Math.round(point.rating ?? 0)
      return {
        code: point.contestName ?? `contest-${index + 1}`,
        getyear: date ? String(date.getUTCFullYear()) : '',
        getmonth: date ? String(date.getUTCMonth() + 1) : '',
        getday: date ? String(date.getUTCDate()) : '',
        reason: null,
        penalised_in: null,
        rating: String(rating),
        rank: '',
        name: point.contestName ?? `Contest ${index + 1}`,
        end_date: date ? date.toISOString().slice(0, 10) : '',
        color: ratingColor(rating),
      }
    }),
  }
}

export async function fetchCodeChefDetail(
  username: string,
  heatmapOptions: { view?: 'all' | 'last_365' | 'year'; year?: number | null } = {},
): Promise<CodeChefDetailData> {
  const [profile, heatmap, ratingHistory] = await Promise.all([
    fetchCodeChefStats(username),
    fetchCodeChefHeatmap(username, heatmapOptions),
    fetchCodeChefRating(username),
  ])

  return {
    ...profile,
    heatmap,
    ratingHistory,
  }
}
