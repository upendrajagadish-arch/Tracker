import type {
  ContributionTotals,
  HackerRankBadge,
  HackerRankContest,
  HackerRankData,
  HackerRankDetailData,
  HackerRankHeatmapData,
  HackerRankProfile,
  RecentSubmission,
  SubmitStats,
} from '../types/api'
import type {
  BadgeItem,
  ContestHistoryItem,
  UnifiedBadges,
  UnifiedContests,
  UnifiedEnvelope,
  UnifiedHeatmap,
  UnifiedProfile,
  UnifiedStats,
} from '../types/unified'
import { asNumber, fetchUnifiedEnvelope, windowUnifiedHeatmap } from './unifiedClient'

type HackerRankStatsEnvelope = UnifiedEnvelope<UnifiedStats> & Partial<{
  totalSolved: number
  totalQuestions: number
  easySolved: number
  totalEasy: number
  mediumSolved: number
  totalMedium: number
  hardSolved: number
  totalHard: number
  acceptanceRate: number
  ranking: number
  contributionPoints: number
  practiceScore: number
  reputation: number
  submissionCalendar: Record<string, number>
}>

type HackerRankProfileEnvelope = UnifiedEnvelope<UnifiedProfile> & Partial<{
  githubUrl: string | null
  twitterUrl: string | null
  linkedinUrl: string | null
  contributions: ContributionTotals
  profile: HackerRankProfile
  activeBadge: HackerRankBadge | null
  submitStats: SubmitStats
  submissionCalendar: Record<string, number>
  recentSubmissions: RecentSubmission[]
}>

type HackerRankContestEnvelope = UnifiedEnvelope<UnifiedContests> & Partial<{
  attendedContestsCount: number
  rating: number
  globalRanking: number
  totalParticipants: number
  topPercentage: number
  badge: { name: string } | null
  contestHistory: HackerRankContest[]
}>

type HackerRankBadgesEnvelope = UnifiedEnvelope<UnifiedBadges> & Partial<{
  badges: HackerRankBadge[]
  upcomingBadges: Array<{ icon: string; name: string }>
  activeBadge: HackerRankBadge | null
}>

function profileFromUnified(profile: UnifiedProfile): HackerRankProfile {
  return {
    realName: profile.displayName ?? profile.username ?? '',
    userAvatar: profile.avatar ?? '',
    birthday: null,
    ranking: 0,
    reputation: 0,
    websites: profile.websites ?? [],
    countryName: profile.country ?? '',
    company: profile.company,
    school: profile.institution,
    skillTags: [],
    aboutMe: profile.bio ?? '',
    starRating: 0,
  }
}

function contestFromUnified(item: ContestHistoryItem): HackerRankContest {
  return {
    attended: true,
    contest: { startTime: item.timestamp ?? 0, title: item.name ?? 'Contest' },
    finishTimeInSeconds: item.timestamp ?? 0,
    problemsSolved: item.problemsSolved ?? 0,
    ranking: item.ranking ?? 0,
    rating: item.rating ?? 0,
    totalProblems: item.totalProblems ?? 0,
    trendDirection: 'SAME',
  }
}

function badgeFromUnified(badge: BadgeItem): HackerRankBadge {
  return {
    id: badge.id ?? badge.name ?? '',
    displayName: badge.name ?? '',
    icon: badge.icon ?? '',
    creationDate: 0,
  }
}

function normalizeHackerRankStats(
  stats: HackerRankStatsEnvelope,
): HackerRankData {
  const difficulty = stats.data.byDifficulty ?? {}
  const totalSolved = stats.data.totalSolved ?? stats.totalSolved ?? 0
  const rawRanking = asNumber(stats.ranking ?? 0)
  return {
    status: stats.status ?? 'success',
    message: stats.message ?? 'retrieved',
    totalSolved,
    totalQuestions: stats.data.totalQuestions ?? stats.totalQuestions ?? 0,
    easySolved: asNumber(difficulty.easy, stats.easySolved ?? 0),
    totalEasy: stats.totalEasy ?? 0,
    mediumSolved: asNumber(difficulty.medium, stats.mediumSolved ?? 0),
    totalMedium: stats.totalMedium ?? 0,
    hardSolved: asNumber(difficulty.hard, stats.hardSolved ?? 0),
    totalHard: stats.totalHard ?? 0,
    acceptanceRate: stats.data.acceptanceRate ?? null,
    ranking: rawRanking > 0 ? rawRanking : null,
    contributionPoints: stats.contributionPoints ?? 0,
    practiceScore: asNumber(stats.practiceScore ?? stats.totalSolved ?? stats.contributionPoints ?? 0),
    reputation: stats.reputation ?? 0,
    submissionCalendar: stats.submissionCalendar ?? {},
  }
}

async function fetchHackerRankStatsEnvelope(username: string) {
  return fetchUnifiedEnvelope<UnifiedStats>('hackerrank', username, 'stats') as Promise<HackerRankStatsEnvelope>
}

async function fetchHackerRankProfileEnvelope(username: string) {
  return fetchUnifiedEnvelope<UnifiedProfile>('hackerrank', username, 'profile') as Promise<HackerRankProfileEnvelope>
}

export async function fetchHackerRankStats(username: string): Promise<HackerRankData> {
  return normalizeHackerRankStats(await fetchHackerRankStatsEnvelope(username))
}

export async function fetchHackerRankDetail(username: string): Promise<HackerRankDetailData> {
  const [stats, profileRes, contestRes, badgesRes] = await Promise.allSettled([
    fetchHackerRankStatsEnvelope(username),
    fetchHackerRankProfileEnvelope(username),
    fetchUnifiedEnvelope<UnifiedContests>('hackerrank', username, 'contests') as Promise<HackerRankContestEnvelope>,
    fetchUnifiedEnvelope<UnifiedBadges>('hackerrank', username, 'badges') as Promise<HackerRankBadgesEnvelope>,
  ])

  if (stats.status === 'rejected') throw new Error((stats.reason as Error).message)

  const profileData = profileRes.status === 'fulfilled' ? profileRes.value : null
  const contestData = contestRes.status === 'fulfilled' ? contestRes.value : null
  const badgesData = badgesRes.status === 'fulfilled' ? badgesRes.value : null
  const activeBadge = badgesData?.activeBadge
    ?? (badgesData?.data.active ? badgeFromUnified(badgesData.data.active) : null)
    ?? profileData?.activeBadge
    ?? null

  return {
    ...normalizeHackerRankStats(stats.value),
    githubUrl: profileData?.data.social.github ?? profileData?.githubUrl ?? null,
    twitterUrl: profileData?.data.social.twitter ?? profileData?.twitterUrl ?? null,
    linkedinUrl: profileData?.data.social.linkedin ?? profileData?.linkedinUrl ?? null,
    contributions: profileData?.contributions ?? null,
    profile: profileData?.profile ?? (profileData ? profileFromUnified(profileData.data) : null),
    contestInfo: contestData ? {
      attendedContestsCount: contestData.data.count ?? contestData.attendedContestsCount ?? 0,
      rating: contestData.data.rating ?? contestData.rating ?? 0,
      globalRanking: contestData.data.globalRanking ?? contestData.globalRanking ?? 0,
      totalParticipants: contestData.totalParticipants ?? 0,
      topPercentage: contestData.data.topPercentage ?? contestData.topPercentage ?? 0,
      badge: contestData.badge ?? (contestData.data.rank ? { name: contestData.data.rank } : null),
      contestHistory: contestData.contestHistory ?? contestData.data.history.map(contestFromUnified),
    } : null,
    badges: badgesData?.badges ?? badgesData?.data.list.map(badgeFromUnified) ?? [],
    upcomingBadges: badgesData?.upcomingBadges ?? [],
    activeBadge,
    submitStats: profileData?.submitStats ?? null,
    recentSubmissions: profileData?.recentSubmissions ?? [],
  }
}

export async function fetchHackerRankHeatmap(
  username: string,
  options: { view?: 'all' | 'last_365' | 'year'; year?: number | null } = {},
): Promise<HackerRankHeatmapData> {
  const envelope = await fetchUnifiedEnvelope<UnifiedHeatmap>('hackerrank', username, 'heatmap', {
    view: options.view,
    year: options.year,
  })
  const heatmap = windowUnifiedHeatmap(envelope.data, options)

  return {
    status: envelope.status ?? 'success',
    message: envelope.message ?? 'retrieved',
    username: envelope.username ?? username,
    startDate: heatmap.startDate,
    endDate: heatmap.endDate,
    totalSubmissions: heatmap.totalSubmissions,
    activeDays: heatmap.totalActiveDays,
    currentStreak: heatmap.currentStreak,
    longestStreak: heatmap.longestStreak,
    maxDailySubmissions: heatmap.maxDailySubmissions,
    dailyContributions: heatmap.dailyContributions.map((day) => ({
      ...day,
      timestamp: Math.floor(Date.parse(`${day.date}T00:00:00Z`) / 1000),
    })),
    view: options.view,
    year: options.year ?? null,
    availableYears: heatmap.availableYears,
  }
}
