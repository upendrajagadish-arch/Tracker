// Unified cross-platform stats schema — mirrors the backend `UNIFIED_SCHEMA.md`
// shared by all Stat APIs. CodeTrace composes this shape from the common
// profile/stats/contests/rating/heatmap/badges endpoints.

import type { Platform } from './api'

export type PlatformCategory = 'dsa' | 'competitive' | 'fundamentals' | 'development'

export interface UnifiedSocial {
  github: string | null
  twitter: string | null
  linkedin: string | null
}

export interface UnifiedProfile {
  displayName: string | null
  username: string | null
  avatar: string | null
  country: string | null
  countryFlag: string | null
  institution: string | null
  company: string | null
  bio: string | null
  websites: string[]
  social: UnifiedSocial
  verified: boolean
}

export interface TopicCount {
  topic: string
  count: number
}

export interface UnifiedStats {
  totalSolved: number
  totalQuestions: number | null
  acceptanceRate: number | null
  byDifficulty: Record<string, number>
  topicAnalysis: TopicCount[]
}

export interface ContestHistoryItem {
  name: string | null
  date: string | null
  timestamp: number | null
  rating: number | null
  ranking: number | null
  problemsSolved: number | null
  totalProblems: number | null
}

export interface UnifiedContests {
  count: number
  rating: number | null
  maxRating: number | null
  rank: string | null
  globalRanking: number | null
  topPercentage: number | null
  history: ContestHistoryItem[]
}

export interface RatingPoint {
  timestamp: number | null
  rating: number | null
  contestName: string | null
}

export interface UnifiedRating {
  current: number | null
  max: number | null
  history: RatingPoint[]
}

export interface HeatDay {
  date: string
  count: number
  level: number
}

export interface YearContribution {
  year: number
  totalSubmissions: number
  activeDays: number
}

export interface UnifiedHeatmap {
  totalSubmissions: number
  totalActiveDays: number
  currentStreak: number
  longestStreak: number
  maxDailySubmissions: number
  firstActiveDate: string | null
  lastActiveDate: string | null
  dailyContributions: HeatDay[]
  yearlyContributions: YearContribution[]
  // Windowing metadata added by the backend. availableYears/yearlyContributions
  // always describe the full history; the rest reflect the requested view.
  availableYears?: number[]
  view?: string
  year?: number | null
  startDate?: string | null
  endDate?: string | null
}

export interface BadgeItem {
  id: string | null
  name: string | null
  icon: string | null
  level: string | null
}

export interface UnifiedBadges {
  count: number
  active: BadgeItem | null
  list: BadgeItem[]
}

export interface UnifiedCard {
  platform: Platform
  username: string
  category: PlatformCategory
  profile: UnifiedProfile
  stats: UnifiedStats
  contests: UnifiedContests
  rating: UnifiedRating
  heatmap: UnifiedHeatmap
  badges: UnifiedBadges
}

// The envelope every unified endpoint returns. Legacy fields are preserved at
// the top level; the normalized payload lives under `data`.
export interface UnifiedEnvelope<T = unknown> {
  status?: string
  message?: string
  platform?: Platform
  username?: string
  cached?: boolean
  data: T
  [legacyField: string]: unknown
}
