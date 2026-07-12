// Per-platform query hooks wrapping the existing service functions.
//
// These power the platform *detail* pages, which render richer, platform-native
// data (recent submissions, repos, full rating history) than the unified card
// carries. The fetching lives in `src/api/*`; these hooks own the query keys and
// caching so pages stay declarative.

import { useQuery, keepPreviousData } from '@tanstack/react-query'

import { fetchGitHubDetail } from '../api/github'
import { fetchLeetCodeDetail, fetchLeetCodeHeatmap } from '../api/leetcode'
import { fetchCodeforcesDetail, fetchCodeforcesHeatmap, fetchUpcomingContests } from '../api/codeforces'
import { fetchGFGStats, fetchGFGProfile, fetchGFGHeatmap } from '../api/gfg'
import { fetchCodeChefStats, fetchCodeChefRating, fetchCodeChefHeatmap } from '../api/codechef'
import { fetchHackerRankDetail, fetchHackerRankHeatmap } from '../api/hackerrank'
import { fetchTUFDetail, fetchTUFHeatmap } from '../api/tuf'

const on = (u?: string) => !!u

// ── GitHub ──────────────────────────────────────────────────────────────────
export const useGitHubDetail = (username?: string) =>
  useQuery({
    queryKey: ['github-detail', username],
    queryFn: () => fetchGitHubDetail(username!),
    enabled: on(username),
  })

// ── LeetCode ────────────────────────────────────────────────────────────────
export const useLeetCodeDetail = (username?: string) =>
  useQuery({
    queryKey: ['leetcode-detail', username],
    queryFn: () => fetchLeetCodeDetail(username!),
    enabled: on(username),
  })

export const useLeetCodeHeatmap = (
  username: string | undefined,
  options: { view?: 'all' | 'last_365' | 'year'; year?: number | null } = {},
) =>
  useQuery({
    queryKey: ['leetcode-heatmap', username, options.view ?? null, options.year ?? null],
    queryFn: () => fetchLeetCodeHeatmap(username!, options),
    enabled: on(username),
    placeholderData: keepPreviousData,
    retry: false,
  })

// ── Codeforces ──────────────────────────────────────────────────────────────
export const useCodeforcesDetail = (username?: string) =>
  useQuery({
    queryKey: ['codeforces-detail', username],
    queryFn: () => fetchCodeforcesDetail(username!),
    enabled: on(username),
  })

export const useCodeforcesHeatmap = (
  username: string | undefined,
  options: { view?: 'all' | 'last_365' | 'year'; year?: number | null } = {},
) =>
  useQuery({
    queryKey: ['cf-heatmap', username, options.view ?? null, options.year ?? null],
    queryFn: () => fetchCodeforcesHeatmap(username!, options),
    enabled: on(username),
    retry: false,
    placeholderData: keepPreviousData,
  })

export const useUpcomingContests = () =>
  useQuery({
    queryKey: ['cf-upcoming-contests'],
    queryFn: fetchUpcomingContests,
    staleTime: 10 * 60 * 1000,
  })

// ── GFG ─────────────────────────────────────────────────────────────────────
export const useGFGStats = (username?: string) =>
  useQuery({
    queryKey: ['gfg-stats', username],
    queryFn: () => fetchGFGStats(username!),
    enabled: on(username),
    retry: false,
  })

export const useGFGProfile = (username?: string) =>
  useQuery({
    queryKey: ['gfg-profile', username],
    queryFn: () => fetchGFGProfile(username!),
    enabled: on(username),
    retry: false,
  })

export const useGFGHeatmap = (
  username: string | undefined,
  options: { view?: 'all' | 'last_365' | 'year'; year?: number | null } = {},
) =>
  useQuery({
    queryKey: ['gfg-heatmap', username, options.view ?? null, options.year ?? null],
    queryFn: () => fetchGFGHeatmap(username!, options),
    enabled: on(username),
    retry: false,
    placeholderData: keepPreviousData,
  })

// ── CodeChef ────────────────────────────────────────────────────────────────
export const useCodeChefStats = (username?: string) =>
  useQuery({
    queryKey: ['codechef-profile', username],
    queryFn: () => fetchCodeChefStats(username!),
    enabled: on(username),
  })

export const useCodeChefRating = (username?: string) =>
  useQuery({
    queryKey: ['codechef-rating', username],
    queryFn: () => fetchCodeChefRating(username!),
    enabled: on(username),
  })

export const useCodeChefHeatmap = (
  username: string | undefined,
  options: { view?: 'all' | 'last_365' | 'year'; year?: number | null } = {},
) =>
  useQuery({
    queryKey: ['codechef-heatmap', username, options.view ?? null, options.year ?? null],
    queryFn: () => fetchCodeChefHeatmap(username!, options),
    enabled: on(username),
    placeholderData: keepPreviousData,
  })

// ── HackerRank ──────────────────────────────────────────────────────────────
export const useHackerRankDetail = (username?: string) =>
  useQuery({
    queryKey: ['hackerrank-detail', username],
    queryFn: () => fetchHackerRankDetail(username!),
    enabled: on(username),
  })

export const useHackerRankHeatmap = (
  username: string | undefined,
  options: { view?: 'all' | 'last_365' | 'year'; year?: number | null } = {},
) =>
  useQuery({
    queryKey: ['hackerrank-heatmap', username, options.view ?? null, options.year ?? null],
    queryFn: () => fetchHackerRankHeatmap(username!, options),
    enabled: on(username),
    placeholderData: keepPreviousData,
    retry: false,
  })

// ── TUF (takeUforward) ──────────────────────────────────────────────────────
export const useTUFDetail = (username?: string) =>
  useQuery({
    queryKey: ['tuf-detail', username],
    queryFn: () => fetchTUFDetail(username!),
    enabled: on(username),
    retry: false,
  })

export const useTUFHeatmap = (
  username: string | undefined,
  options: { view?: 'all' | 'last_365' | 'year'; year?: number | null } = {},
) =>
  useQuery({
    queryKey: ['tuf-heatmap', username, options.view ?? null, options.year ?? null],
    queryFn: () => fetchTUFHeatmap(username!, options),
    enabled: on(username),
    retry: false,
    placeholderData: keepPreviousData,
  })
