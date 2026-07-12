import type { UnifiedHeatmap, UnifiedProfile } from './unified';

export type Platform = 'github' | 'leetcode' | 'codeforces' | 'gfg' | 'codechef' | 'hackerrank' | 'tuf';

export interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export interface Usernames {
  github: string;
  leetcode: string;
  codeforces: string;
  gfg: string;
  codechef: string;
  hackerrank: string;
  tuf: string;
}

export interface ContributionTotals {
  points: number;
  questionCount: number;
  testcaseCount: number;
}

export interface SubmitStatEntry {
  difficulty: string;
  count: number;
  submissions: number;
  rank?: number;
}

export interface SubmitStats {
  acSubmissionNum: SubmitStatEntry[];
  totalSubmissionNum: SubmitStatEntry[];
}

export interface RecentSubmission {
  title: string;
  titleSlug: string;
  timestamp: number;
  statusDisplay: string;
  lang: string;
}

export interface PracticeProfile {
  realName: string;
  userAvatar: string;
  birthday: string | null;
  ranking: number;
  reputation: number;
  websites: string[];
  countryName: string;
  company: string | null;
  school: string | null;
  skillTags: string[];
  aboutMe: string;
  starRating: number;
}

// ── GitHub ────────────────────────────────────────────────────────────────

export interface TopLanguage {
  name: string;
  percentage: number;
}

export interface PinnedRepo {
  name: string;
  description: string;
  url: string;
  stars: number;
  forks: number;
  primary_language: string;
}

export interface GitHubRepo {
  title: string;
  description: string | null;
  live_website_url: string | null;
  languages: string[];
  num_commits: number;
  stars: number;
  forks: number;
  is_fork: boolean;
  original_repo: {
    name: string;
    full_name: string;
    owner: string;
    url: string;
  } | null;
  readme?: string;
}

export interface GitHubPR {
  repo: string;
  number: number;
  title: string;
  state: 'open' | 'closed' | 'merged';
  created_at: string;
  updated_at: string;
  merged_at: string | null;
  url: string;
  body: string;
}

export interface OrgContribution {
  org: string;
  org_id: number;
  org_url: string;
  org_avatar_url: string;
  repos: string[];
}

export interface ContributionDay {
  contributionCount: number;
  date: string;
}

export interface ContributionWeek {
  contributionDays: ContributionDay[];
}

export interface GitHubContributions {
  contributions: Record<string, {
    data: {
      user: {
        createdAt?: string;
        contributionsCollection: {
          contributionYears?: number[];
          contributionCalendar: {
            weeks: ContributionWeek[];
          };
        };
      };
    };
  }>;
  totalCommits: number;
  longestStreak: number;
  currentStreak: number;
}

export interface GitHubFullData {
  profile: UnifiedProfile;
  heatmap: UnifiedHeatmap;
  stats: {
    topLanguages: TopLanguage[];
    totalCommits: number;
    longestStreak: number;
    currentStreak: number;
    profile_visitors?: number;
  };
  pinned: PinnedRepo[];
  stars: { total_stars: number; repositories: Array<{ name: string; stars: number; url: string; language: string; description: string }> };
}

export interface GitHubDetailData extends GitHubFullData {
  contributions: GitHubContributions | null;
  prs: GitHubPR[];
  orgContributions: OrgContribution[];
  profileViews: number;
}

// ── LeetCode ──────────────────────────────────────────────────────────────

export interface LeetCodeData {
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  totalSolved: number;
  totalEasy: number;
  totalMedium: number;
  totalHard: number;
  totalQuestions: number;
  acceptanceRate: number;
  ranking: number;
  submissionCalendar: Record<string, number>;
  profile: PracticeProfile | null;
}

export interface LeetCodeContest {
  attended: boolean;
  contest: { startTime: number; title: string };
  finishTimeInSeconds: number;
  problemsSolved: number;
  ranking: number;
  rating: number;
  totalProblems: number;
  trendDirection: 'UP' | 'DOWN' | 'SAME';
}

export interface LeetCodeBadge {
  creationDate: string | number;
  displayName: string;
  icon: string;
  id: string;
}

export interface LeetCodeDetailData extends LeetCodeData {
  githubUrl: string | null;
  twitterUrl: string | null;
  linkedinUrl: string | null;
  contributions: ContributionTotals | null;
  contestInfo: {
    attendedContestsCount: number;
    badge: { name: string } | null;
    contestHistory: LeetCodeContest[];
  } | null;
  badges: LeetCodeBadge[];
  upcomingBadges: Array<{ icon: string; name: string }>;
  activeBadge: LeetCodeBadge | null;
  submitStats: SubmitStats | null;
  recentSubmissions: RecentSubmission[];
}

// ── Codeforces ────────────────────────────────────────────────────────────

export interface RatingPoint {
  contestId: number;
  contestName: string;
  rank: number;
  ratingUpdateTimeSeconds?: number;
  newRating: number;
  oldRating: number;
}

export interface CodeforcesData {
  handle: string;
  rating: number | null;
  maxRating: number | null;
  rank: string | null;
  maxRank: string | null;
  country: string | null;
  city?: string | null;
  organization?: string | null;
  contribution: number | null;
  avatar: string | null;
  titlePhoto?: string | null;
  friendOfCount?: number | null;
  registrationTimeSeconds?: number | null;
  contests_count: number;
  solved_problems_count: number;
  rating_history: RatingPoint[] | null;
}

export interface UpcomingContest {
  id: number;
  name: string;
  startTimeSeconds: number;
  durationSeconds: number;
  type?: string;
  phase?: string;
  websiteUrl?: string | null;
  description?: string | null;
  preparedBy?: string | null;
  kind?: string | null;
  season?: string | null;
}

export interface CodeforcesDetailData extends CodeforcesData {
  ratingHistory: RatingPoint[];
  solvedCount: number;
}

// ── GFG ───────────────────────────────────────────────────────────────────

export interface GFGData {
  totalProblemsSolved: number;
  School: number;
  Basic: number;
  Easy: number;
  Medium: number;
  Hard: number;
}

export interface GFGProfileData {
  userName: string;
  profilePicture: string;
  institute: string;
  instituteRank: number;
  currentStreak: number;
  maxStreak: number;
  codingScore: number;
  monthlyScore: number;
  totalProblemsSolved: number;
}

// ── Heatmap Types ─────────────────────────────────────────────────────────

export interface CodeforcesHeatmapEntry {
  date: string;
  submissions: number;
  accepted: number;
}

export interface CodeforcesHeatmapData {
  handle: string;
  mode: string;
  timezone: string;
  days: number;
  year?: number | null;
  start_date: string;
  end_date: string;
  available_years?: number[];
  total_submissions: number;
  total_accepted: number;
  active_days: number;
  current_streak: number;
  longest_streak: number;
  heatmap: CodeforcesHeatmapEntry[];
}

export interface HeatmapDay {
  date: string;
  count: number;
  level: number;
  timestamp: number;
}

export interface LeetCodeHeatmapData {
  status: string;
  message: string;
  username: string;
  startDate: string;
  endDate: string;
  firstActiveDate: string;
  lastActiveDate: string;
  totalSubmissions: number;
  activeDays: number;
  currentStreak: number;
  longestStreak: number;
  maxDailySubmissions: number;
  dailyContributions: HeatmapDay[];
  yearlyContributions: Array<{ year: number; totalSubmissions: number; activeDays: number }>;
  view?: string;
  year?: number | null;
  availableYears?: number[];
}

export interface GFGHeatmapEntry {
  date: string;
  count: number;
}

export interface GFGHeatmapData {
  userName: string;
  range: string;
  accountCreatedDate: string;
  fromDate: string;
  toDate: string;
  availableYears: number[];
  totalActiveDays: number;
  totalSubmissions: number;
  heatmap: GFGHeatmapEntry[];
}

// ── CodeChef ──────────────────────────────────────────────────────────────

export interface CodeChefProfileData {
  handle: string;
  profile: {
    profile: string | null;
    name: string | null;
    currentRating: number | null;
    highestRating: number | null;
    countryFlag: string | null;
    countryName: string | null;
    globalRank: number | null;
    countryRank: number | null;
    stars: string | null;
    totalSolved: number | null;
    contestsCount: number | null;
  };
  contestHistory: CodeChefContestHistoryEntry[];
}

export interface CodeChefContestHistoryEntry {
  name: string | null;
  timestamp: number | null;
  rating: number | null;
  ranking: number | null;
  problemsSolved: number | null;
}

export interface CodeChefHeatmapEntry {
  date: string; // "YYYY-M-D"
  value: number;
}

export interface CodeChefHeatmapData {
  handle: string;
  view: string;
  year: number | null;
  availableYears: number[];
  firstActiveDate: string | null;
  lastActiveDate: string | null;
  totalSubmissions: number;
  totalActiveDays: number;
  currentStreak: number;
  longestStreak: number;
  maxDailySubmissions: number;
  yearlyContributions: { year: number; totalSubmissions: number; activeDays: number }[];
  heatMap: CodeChefHeatmapEntry[];
}

export interface CodeChefRatingEntry {
  code: string;
  getyear: string;
  getmonth: string;
  getday: string;
  reason: string | null;
  penalised_in: string | null;
  rating: string;
  rank: string;
  name: string;
  end_date: string;
  color: string;
}

export interface CodeChefRatingData {
  handle: string;
  ratingData: CodeChefRatingEntry[];
}

export interface CodeChefDetailData extends CodeChefProfileData {
  heatmap: CodeChefHeatmapData;
  ratingHistory: CodeChefRatingData;
}

// ── HackerRank ────────────────────────────────────────────────────────────

export interface HackerRankData {
  status: string;
  message: string;
  totalSolved: number;
  totalQuestions: number;
  easySolved: number;
  totalEasy: number;
  mediumSolved: number;
  totalMedium: number;
  hardSolved: number;
  totalHard: number;
  acceptanceRate: number | null;
  ranking: number | null;
  contributionPoints: number;
  practiceScore: number;
  reputation: number;
  submissionCalendar: Record<string, number>;
}

export type HackerRankProfile = PracticeProfile;

export interface HackerRankContest {
  attended: boolean;
  rating: number;
  ranking: number;
  trendDirection: string;
  problemsSolved: number;
  totalProblems: number;
  finishTimeInSeconds: number;
  contest: { title: string; startTime: number };
}

export interface HackerRankBadge {
  id: string;
  displayName: string;
  icon: string;
  creationDate: number;
}

export interface HackerRankDetailData extends HackerRankData {
  githubUrl: string | null;
  twitterUrl: string | null;
  linkedinUrl: string | null;
  contributions: ContributionTotals | null;
  profile: HackerRankProfile | null;
  contestInfo: {
    attendedContestsCount: number;
    rating: number;
    globalRanking: number;
    totalParticipants: number;
    topPercentage: number;
    badge: { name: string } | null;
    contestHistory: HackerRankContest[];
  } | null;
  badges: HackerRankBadge[];
  upcomingBadges: Array<{ name: string; icon: string }>;
  activeBadge: HackerRankBadge | null;
  submitStats: SubmitStats | null;
  recentSubmissions: RecentSubmission[];
}

export interface HackerRankHeatmapData {
  status: string;
  message: string;
  username: string;
  startDate: string;
  endDate: string;
  totalSubmissions: number;
  activeDays: number;
  currentStreak: number;
  longestStreak: number;
  maxDailySubmissions: number;
  dailyContributions: Array<{
    date: string;
    timestamp: number;
    count: number;
    level: number;
  }>;
  view?: string;
  year?: number | null;
  availableYears?: number[];
}
