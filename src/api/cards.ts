// Unified card service — one fetcher for every platform.
//
// Each Stat API exposes the same unified sub-endpoints. Build the profile card
// from those endpoints instead of depending on a dedicated all-in-one card
// route, so CodeTrace only needs one loop for every platform.

import type { Platform } from '../types/api'
import type {
  UnifiedBadges,
  UnifiedCard,
  UnifiedContests,
  UnifiedHeatmap,
  UnifiedProfile,
  UnifiedRating,
  UnifiedStats,
} from '../types/unified'
import { ALL_PLATFORMS, fetchUnifiedEnvelope } from './unifiedClient'

export { ALL_PLATFORMS }

type CardEndpoint = 'profile' | 'stats' | 'contests' | 'rating' | 'heatmap' | 'badges'

type CardEndpointData = {
  profile: UnifiedProfile
  stats: UnifiedStats
  contests: UnifiedContests
  rating: UnifiedRating
  heatmap: UnifiedHeatmap
  badges: UnifiedBadges
}

const CARD_ENDPOINTS: CardEndpoint[] = [
  'profile',
  'stats',
  'contests',
  'rating',
  'heatmap',
  'badges',
]

function emptyProfile(username: string): UnifiedProfile {
  return {
    displayName: null,
    username,
    avatar: null,
    country: null,
    countryFlag: null,
    institution: null,
    company: null,
    bio: null,
    websites: [],
    social: { github: null, twitter: null, linkedin: null },
    verified: false,
  }
}

const emptyStats: UnifiedStats = {
  totalSolved: 0,
  totalQuestions: null,
  acceptanceRate: null,
  byDifficulty: {},
  topicAnalysis: [],
}

const emptyContests: UnifiedContests = {
  count: 0,
  rating: null,
  maxRating: null,
  rank: null,
  globalRanking: null,
  topPercentage: null,
  history: [],
}

const emptyRating: UnifiedRating = {
  current: null,
  max: null,
  history: [],
}

const emptyHeatmap: UnifiedHeatmap = {
  totalSubmissions: 0,
  totalActiveDays: 0,
  currentStreak: 0,
  longestStreak: 0,
  maxDailySubmissions: 0,
  firstActiveDate: null,
  lastActiveDate: null,
  dailyContributions: [],
  yearlyContributions: [],
}

const emptyBadges: UnifiedBadges = {
  count: 0,
  active: null,
  list: [],
}

function endpointFallback(endpoint: CardEndpoint, username: string): CardEndpointData[CardEndpoint] {
  switch (endpoint) {
    case 'profile': return emptyProfile(username)
    case 'stats': return emptyStats
    case 'contests': return emptyContests
    case 'rating': return emptyRating
    case 'heatmap': return emptyHeatmap
    case 'badges': return emptyBadges
  }
}

async function fetchCardEndpoint<T extends CardEndpoint>(
  platform: Platform,
  username: string,
  endpoint: T,
): Promise<CardEndpointData[T]> {
  const envelope = await fetchUnifiedEnvelope<CardEndpointData[T]>(platform, username, endpoint)
  return envelope.data
}

async function fetchCardEndpoints(platform: Platform, username: string): Promise<CardEndpointData> {
  let successCount = 0
  let firstError: Error | null = null
  const entries = await Promise.all(
    CARD_ENDPOINTS.map(async (endpoint) => {
      try {
        const data = await fetchCardEndpoint(platform, username, endpoint)
        successCount += 1
        return [endpoint, data] as const
      } catch (error) {
        if (!firstError) firstError = error instanceof Error ? error : new Error(String(error))
        return [endpoint, endpointFallback(endpoint, username)] as const
      }
    }),
  )

  if (successCount === 0) throw firstError ?? new Error(`${platform} request failed`)

  return Object.fromEntries(entries) as CardEndpointData
}

/**
 * Fetch a single platform's unified profile card by composing common endpoints.
 */
export async function fetchCard(platform: Platform, username: string): Promise<UnifiedCard> {
  const handle = username.trim()
  if (!handle) throw new Error('username required')

  const data = await fetchCardEndpoints(platform, handle)
  return {
    platform,
    username: data.profile.username || handle,
    category: platform === 'github' ? 'development' : platform === 'codeforces' || platform === 'codechef' ? 'competitive' : 'dsa',
    ...data,
  }
}
