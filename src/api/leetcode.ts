import type {
  ContributionTotals,
  LeetCodeBadge,
  LeetCodeContest,
  LeetCodeData,
  LeetCodeDetailData,
  LeetCodeHeatmapData,
  PracticeProfile,
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

type LeetCodeStatsEnvelope = UnifiedEnvelope<UnifiedStats> & Partial<{
  easySolved: number
  mediumSolved: number
  hardSolved: number
  totalSolved: number
  totalEasy: number
  totalMedium: number
  totalHard: number
  totalQuestions: number
  acceptanceRate: number
  ranking: number
  submissionCalendar: Record<string, number>
}>

type LeetCodeProfileEnvelope = UnifiedEnvelope<UnifiedProfile> & Partial<{
  githubUrl: string | null
  twitterUrl: string | null
  linkedinUrl: string | null
  contributions: ContributionTotals
  profile: PracticeProfile
  activeBadge: LeetCodeBadge | null
  submitStats: SubmitStats
  submissionCalendar: Record<string, number>
  recentSubmissions: RecentSubmission[]
}>

type LeetCodeContestEnvelope = UnifiedEnvelope<UnifiedContests> & Partial<{
  attendedContestsCount: number
  badge: { name: string } | null
  contestHistory: LeetCodeContest[]
}>

type LeetCodeBadgesEnvelope = UnifiedEnvelope<UnifiedBadges> & Partial<{
  badges: LeetCodeBadge[]
  upcomingBadges: Array<{ icon: string; name: string }>
  activeBadge: LeetCodeBadge | null
}>

function profileFromUnified(profile: UnifiedProfile): PracticeProfile {
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

function contestFromUnified(item: ContestHistoryItem): LeetCodeContest {
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

function badgeFromUnified(badge: BadgeItem): LeetCodeBadge {
  return {
    id: badge.id ?? badge.name ?? '',
    displayName: badge.name ?? '',
    icon: badge.icon ?? '',
    creationDate: '',
  }
}

function normalizeLeetCodeStats(
  stats: LeetCodeStatsEnvelope,
  profile: PracticeProfile | null,
): LeetCodeData {
  const difficulty = stats.data.byDifficulty ?? {}
  return {
    easySolved: asNumber(difficulty.easy, stats.easySolved ?? 0),
    mediumSolved: asNumber(difficulty.medium, stats.mediumSolved ?? 0),
    hardSolved: asNumber(difficulty.hard, stats.hardSolved ?? 0),
    totalSolved: stats.data.totalSolved ?? stats.totalSolved ?? 0,
    totalEasy: stats.totalEasy ?? 0,
    totalMedium: stats.totalMedium ?? 0,
    totalHard: stats.totalHard ?? 0,
    totalQuestions: stats.data.totalQuestions ?? stats.totalQuestions ?? 0,
    acceptanceRate: stats.data.acceptanceRate ?? stats.acceptanceRate ?? 0,
    ranking: stats.ranking ?? 0,
    submissionCalendar: stats.submissionCalendar ?? {},
    profile,
  }
}

async function fetchLeetCodeStatsEnvelope(username: string) {
  return fetchUnifiedEnvelope<UnifiedStats>('leetcode', username, 'stats') as Promise<LeetCodeStatsEnvelope>
}

async function fetchLeetCodeProfileEnvelope(username: string) {
  return fetchUnifiedEnvelope<UnifiedProfile>('leetcode', username, 'profile') as Promise<LeetCodeProfileEnvelope>
}

export async function fetchLeetCodeStats(username: string): Promise<LeetCodeData> {
  const [stats, profile] = await Promise.allSettled([
    fetchLeetCodeStatsEnvelope(username),
    fetchLeetCodeProfileEnvelope(username),
  ])

  if (stats.status === 'rejected') throw new Error((stats.reason as Error).message)
  const profileData = profile.status === 'fulfilled'
    ? profile.value.profile ?? profileFromUnified(profile.value.data)
    : null
  return normalizeLeetCodeStats(stats.value, profileData)
}

export async function fetchLeetCodeDetail(username: string): Promise<LeetCodeDetailData> {
  const [statsRes, profileRes, contestRes, badgesRes] = await Promise.allSettled([
    fetchLeetCodeStatsEnvelope(username),
    fetchLeetCodeProfileEnvelope(username),
    fetchUnifiedEnvelope<UnifiedContests>('leetcode', username, 'contests') as Promise<LeetCodeContestEnvelope>,
    fetchUnifiedEnvelope<UnifiedBadges>('leetcode', username, 'badges') as Promise<LeetCodeBadgesEnvelope>,
  ])

  if (statsRes.status === 'rejected') throw new Error((statsRes.reason as Error).message)

  const profileData = profileRes.status === 'fulfilled' ? profileRes.value : null
  const contestData = contestRes.status === 'fulfilled' ? contestRes.value : null
  const badgesData = badgesRes.status === 'fulfilled' ? badgesRes.value : null
  const profile = profileData?.profile ?? (profileData ? profileFromUnified(profileData.data) : null)
  const activeBadge = badgesData?.activeBadge
    ?? (badgesData?.data.active ? badgeFromUnified(badgesData.data.active) : null)
    ?? profileData?.activeBadge
    ?? null

  return {
    ...normalizeLeetCodeStats(statsRes.value, profile),
    githubUrl: profileData?.data.social.github ?? profileData?.githubUrl ?? null,
    twitterUrl: profileData?.data.social.twitter ?? profileData?.twitterUrl ?? null,
    linkedinUrl: profileData?.data.social.linkedin ?? profileData?.linkedinUrl ?? null,
    contributions: profileData?.contributions ?? null,
    contestInfo: contestData ? {
      attendedContestsCount: contestData.data.count ?? contestData.attendedContestsCount ?? 0,
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

export async function fetchLeetCodeHeatmap(
  username: string,
  options: { view?: 'all' | 'last_365' | 'year'; year?: number | null } = {},
): Promise<LeetCodeHeatmapData> {
  const envelope = await fetchUnifiedEnvelope<UnifiedHeatmap>('leetcode', username, 'heatmap', {
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
    firstActiveDate: heatmap.firstActiveDate ?? '',
    lastActiveDate: heatmap.lastActiveDate ?? '',
    totalSubmissions: heatmap.totalSubmissions,
    activeDays: heatmap.totalActiveDays,
    currentStreak: heatmap.currentStreak,
    longestStreak: heatmap.longestStreak,
    maxDailySubmissions: heatmap.maxDailySubmissions,
    dailyContributions: heatmap.dailyContributions.map((day) => ({
      ...day,
      timestamp: Math.floor(Date.parse(`${day.date}T00:00:00Z`) / 1000),
    })),
    yearlyContributions: envelope.data.yearlyContributions,
    view: options.view,
    year: options.year ?? null,
    availableYears: heatmap.availableYears,
  }
}
