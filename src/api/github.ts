import type { GitHubFullData, GitHubDetailData, PinnedRepo, GitHubPR, OrgContribution, GitHubContributions } from '../types/api'
import type { UnifiedCard } from '../types/unified'
import { fetchCard } from './cards'
import { PLATFORM_BASE } from './unifiedClient'

const BASE = PLATFORM_BASE.github

/** Fetch a legacy GitHub endpoint, tolerating failure so one broken
 *  sub-endpoint never blanks the whole profile page. */
async function ghJSON<T>(path: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(`${BASE}/${path}`)
    if (!res.ok) return fallback
    return (await res.json()) as T
  } catch {
    return fallback
  }
}

function githubFromCard(card: UnifiedCard): GitHubFullData {
  const totalCommits = card.stats.totalSolved
  return {
    profile: card.profile,
    heatmap: card.heatmap,
    stats: {
      topLanguages: card.stats.topicAnalysis.map((topic) => ({
        name: topic.topic,
        percentage: topic.count,
      })),
      totalCommits,
      longestStreak: card.heatmap.longestStreak,
      currentStreak: card.heatmap.currentStreak,
    },
    pinned: [],
    stars: { total_stars: 0, repositories: [] },
  }
}

export async function fetchGitHubStats(username: string): Promise<GitHubFullData> {
  // The unified card carries commits/languages/heatmap but not pinned repos or
  // star totals, so pull those alongside it for the dashboard card.
  const [card, pinned, stars] = await Promise.all([
    fetchCard('github', username),
    ghJSON<PinnedRepo[]>(`${username}/pinned`, []),
    ghJSON<GitHubFullData['stars']>(`${username}/stars`, { total_stars: 0, repositories: [] }),
  ])

  return {
    ...githubFromCard(card),
    pinned: Array.isArray(pinned) ? pinned : [],
    stars: stars && Array.isArray(stars.repositories) ? stars : { total_stars: 0, repositories: [] },
  }
}

export interface GitHubEngineering {
  prsTotal: number
  prsMerged: number
  prsOpen: number
  stars: number
  orgs: number
}

/** Engineering figures the unified card doesn't carry (PRs, stars, orgs).
 *  The GitHub Stats API has no issues endpoint, so issues are not reported. */
export async function fetchGitHubEngineering(username: string): Promise<GitHubEngineering> {
  const [prs, stars, orgs] = await Promise.all([
    ghJSON<GitHubPR[]>(`${username}/prs`, []),
    ghJSON<GitHubFullData['stars']>(`${username}/stars`, { total_stars: 0, repositories: [] }),
    ghJSON<OrgContribution[]>(`${username}/org-contributions`, []),
  ])
  const list = Array.isArray(prs) ? prs : []
  return {
    prsTotal: list.length,
    prsMerged: list.filter((p) => p.merged_at != null || p.state === 'merged').length,
    prsOpen: list.filter((p) => p.state === 'open').length,
    stars: stars?.total_stars ?? 0,
    orgs: Array.isArray(orgs) ? orgs.length : 0,
  }
}

export async function fetchGitHubDetail(username: string): Promise<GitHubDetailData> {
  const base = await fetchGitHubStats(username)

  // Pull the development-platform detail the unified card doesn't carry.
  // (pinned + stars already came through `fetchGitHubStats` above.)
  const [prs, orgContributions, profileViews, statsRaw] = await Promise.all([
    ghJSON<GitHubPR[]>(`${username}/prs`, []),
    ghJSON<OrgContribution[]>(`${username}/org-contributions`, []),
    ghJSON<{ views: number }>(`${username}/profile-views`, { views: 0 }),
    ghJSON<GitHubContributions | null>(`${username}/stats`, null),
  ])

  // Year-keyed contribution calendar (drives the per-year heatmap + year selector).
  const contributions: GitHubContributions | null =
    statsRaw && statsRaw.contributions
      ? {
          contributions: statsRaw.contributions,
          totalCommits: statsRaw.totalCommits ?? base.stats.totalCommits,
          longestStreak: statsRaw.longestStreak ?? base.stats.longestStreak,
          currentStreak: statsRaw.currentStreak ?? base.stats.currentStreak,
        }
      : null

  return {
    ...base,
    prs: Array.isArray(prs) ? prs : [],
    orgContributions: Array.isArray(orgContributions) ? orgContributions : [],
    profileViews: profileViews?.views ?? 0,
    contributions,
  }
}
