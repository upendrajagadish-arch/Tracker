import type { Platform, Usernames } from '@/types/api'
import { splitAccounts } from '@/lib/utils'

export type ProfileConfig = Partial<Record<Platform, string[]>>

export const EMPTY_USERNAMES: Usernames = {
  github: '',
  leetcode: '',
  codeforces: '',
  gfg: '',
  codechef: '',
  hackerrank: '',
  tuf: '',
}

export const RESERVED_PROFILE_USERNAMES = new Set([
  'account', 'admin', 'api', 'app', 'auth', 'codechef', 'codeforces', 'dashboard', 'docs',
  'faculty', 'gfg', 'github', 'hackerrank', 'interviewer', 'leetcode', 'link', 'links', 'login', 'logout',
  'me', 'onboarding', 'placement', 'profile', 'public', 's', 'settings', 'share', 'student', 'tpo', 'tuf', 'u', 'username',
])

export function normalizeProfileUsername(value: string) {
  return value.trim().toLowerCase()
}

export function validateProfileUsername(value: string) {
  const username = normalizeProfileUsername(value)
  if (!/^[a-z0-9][a-z0-9_-]{2,29}$/.test(username)) {
    return 'Use 3-30 lowercase letters, numbers, underscores, or hyphens.'
  }
  if (RESERVED_PROFILE_USERNAMES.has(username)) {
    return 'That username is reserved.'
  }
  return null
}

export function usernamesToConfig(usernames: Partial<Record<Platform, string>>): ProfileConfig {
  const config: ProfileConfig = {}
  for (const [platform, value] of Object.entries(usernames) as [Platform, string | undefined][]) {
    const accounts = splitAccounts(value)
    if (accounts.length) config[platform] = accounts
  }
  return config
}

export function configToUsernames(config: ProfileConfig): Usernames {
  return {
    ...EMPTY_USERNAMES,
    github: config.github?.join(',') ?? '',
    leetcode: config.leetcode?.join(',') ?? '',
    codeforces: config.codeforces?.join(',') ?? '',
    gfg: config.gfg?.join(',') ?? '',
    codechef: config.codechef?.join(',') ?? '',
    hackerrank: config.hackerrank?.join(',') ?? '',
    tuf: config.tuf?.join(',') ?? '',
  }
}

export function hasConfigAccounts(config: ProfileConfig) {
  return Object.values(config).some((accounts) => accounts && accounts.length > 0)
}
