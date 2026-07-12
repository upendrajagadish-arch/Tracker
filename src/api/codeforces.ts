import type { CodeforcesData, CodeforcesDetailData, RatingPoint, UpcomingContest } from '../types/api'
import type { UnifiedCard, UnifiedHeatmap } from '../types/unified'
import { fetchCard } from './cards'
import { PLATFORM_BASE, fetchUnifiedEnvelope, windowUnifiedHeatmap } from './unifiedClient'

function ratingHistoryFromCard(card: UnifiedCard): RatingPoint[] {
  const contestHistory = card.contests.history.length > 0
    ? card.contests.history
    : card.rating.history.map((point) => ({
        name: point.contestName,
        timestamp: point.timestamp,
        rating: point.rating,
        ranking: null,
      }))

  return contestHistory
    .filter((point) => point.rating != null)
    .map((point, index, all) => {
      const newRating = Math.round(point.rating ?? 0)
      const oldRating = index === 0 ? newRating : Math.round(all[index - 1]?.rating ?? newRating)
      return {
        contestId: index,
        contestName: point.name ?? `Contest ${index + 1}`,
        rank: point.ranking ?? 0,
        ratingUpdateTimeSeconds: point.timestamp ?? undefined,
        newRating,
        oldRating,
      }
    })
}

function codeforcesFromCard(card: UnifiedCard, fallbackHandle: string): CodeforcesData {
  const ratingHistory = ratingHistoryFromCard(card)
  return {
    handle: card.profile.username ?? card.username ?? fallbackHandle,
    rating: card.rating.current ?? card.contests.rating ?? null,
    maxRating: card.rating.max ?? card.contests.maxRating ?? null,
    rank: card.contests.rank,
    maxRank: card.contests.rank,
    country: card.profile.country,
    city: null,
    organization: card.profile.institution ?? card.profile.company,
    contribution: null,
    avatar: card.profile.avatar,
    titlePhoto: card.profile.avatar,
    friendOfCount: null,
    registrationTimeSeconds: null,
    contests_count: card.contests.count,
    solved_problems_count: card.stats.totalSolved,
    rating_history: ratingHistory,
  }
}

export async function fetchCodeforcesStats(userid: string): Promise<CodeforcesData> {
  return codeforcesFromCard(await fetchCard('codeforces', userid), userid)
}

export async function fetchCodeforcesDetail(userid: string): Promise<CodeforcesDetailData> {
  const profile = await fetchCodeforcesStats(userid)
  return {
    ...profile,
    ratingHistory: profile.rating_history ?? [],
    solvedCount: profile.solved_problems_count,
  }
}

export async function fetchUpcomingContests(): Promise<UpcomingContest[]> {
  const data = await fetch(`${PLATFORM_BASE.codeforces}/contests/upcoming`).then(r => r.json())
  return Array.isArray(data) ? data.slice(0, 5) : []
}

export async function fetchCodeforcesHeatmap(
  userid: string,
  options: { view?: 'all' | 'last_365' | 'year'; year?: number | null } = {},
): Promise<import('../types/api').CodeforcesHeatmapData> {
  const view = options.view ?? 'all'
  const envelope = await fetchUnifiedEnvelope<UnifiedHeatmap>('codeforces', userid, 'heatmap', {
    view,
    year: options.year,
  })
  const heatmap = windowUnifiedHeatmap(envelope.data, { view, year: options.year })

  return {
    handle: envelope.username ?? userid,
    mode: view === 'year' ? 'year' : view === 'last_365' ? '365d' : 'all',
    timezone: 'UTC',
    days: heatmap.dailyContributions.length,
    year: options.year ?? null,
    start_date: heatmap.startDate,
    end_date: heatmap.endDate,
    available_years: heatmap.availableYears,
    total_submissions: heatmap.totalSubmissions,
    total_accepted: heatmap.totalSubmissions,
    active_days: heatmap.totalActiveDays,
    current_streak: heatmap.currentStreak,
    longest_streak: heatmap.longestStreak,
    heatmap: heatmap.dailyContributions.map((day) => ({
      date: day.date,
      submissions: day.count,
      accepted: day.count,
    })),
  }
}
