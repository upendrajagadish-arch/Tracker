import type { Platform } from '@/types/api'

/** Brand accent color (CSS var) per platform. */
export const PLATFORM_ACCENT: Record<Platform, string> = {
  github: 'var(--platform-github)',
  leetcode: 'var(--platform-leetcode)',
  codeforces: 'var(--platform-codeforces)',
  gfg: 'var(--platform-gfg)',
  codechef: 'var(--platform-codechef)',
  hackerrank: 'var(--platform-hackerrank)',
  tuf: 'var(--platform-tuf)',
}

/** Human-readable platform label. */
export const PLATFORM_LABEL: Record<Platform, string> = {
  github: 'GitHub',
  leetcode: 'LeetCode',
  codeforces: 'Codeforces',
  gfg: 'GeeksForGeeks',
  codechef: 'CodeChef',
  hackerrank: 'HackerRank',
  tuf: 'takeUforward',
}
