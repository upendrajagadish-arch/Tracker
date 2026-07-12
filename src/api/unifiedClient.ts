import type { Platform } from '../types/api'
import type { UnifiedEnvelope, UnifiedHeatmap } from '../types/unified'

const env = import.meta.env

export const PLATFORM_BASE: Record<Platform, string> = {
  github: env.VITE_GITHUB_API ?? '/api/github',
  leetcode: env.VITE_LEETCODE_API ?? '/api/leetcode',
  codeforces: env.VITE_CODEFORCES_API ?? '/api/codeforces',
  gfg: env.VITE_GFG_API ?? '/api/gfg',
  codechef: env.VITE_CODECHEF_API ?? '/api/codechef',
  hackerrank: env.VITE_HACKERRANK_API ?? '/api/hackerrank',
  tuf: env.VITE_TUF_API ?? '/api/tuf',
}

export const ALL_PLATFORMS: Platform[] = [
  'github', 'leetcode', 'codeforces', 'gfg', 'codechef', 'hackerrank', 'tuf',
]

type QueryValue = string | number | boolean | null | undefined

function queryString(query?: Record<string, QueryValue>) {
  if (!query) return ''
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value != null) params.set(key, String(value))
  }
  const text = params.toString()
  return text ? `?${text}` : ''
}

export function platformUrl(
  platform: Platform,
  username: string,
  path = '',
  query?: Record<string, QueryValue>,
) {
  const handle = encodeURIComponent(username.trim())
  const suffix = path ? `/${path.replace(/^\/+/, '')}` : ''
  return `${PLATFORM_BASE[platform]}/${handle}${suffix}${queryString(query)}`
}

async function getJson(url: string) {
  const res = await fetch(url)
  const payload = await res.json().catch(() => null)
  if (!res.ok) {
    if (res.status === 429) {
      const retryAfter = res.headers.get('Retry-After') ?? payload?.retryAfter
      const retryText = retryAfter ? ` Try again in ${retryAfter} seconds.` : ''
      throw new Error(`Rate limit exceeded.${retryText}`)
    }
    const message = typeof payload?.message === 'string'
      ? payload.message
      : typeof payload?.detail === 'string'
        ? payload.detail
        : `HTTP ${res.status}`
    throw new Error(message)
  }
  return payload
}

export async function fetchUnifiedEnvelope<T>(
  platform: Platform,
  username: string,
  path = '',
  query?: Record<string, QueryValue>,
): Promise<UnifiedEnvelope<T>> {
  const handle = username.trim()
  if (!handle) throw new Error('username required')

  const envelope = await getJson(platformUrl(platform, handle, path, query)) as UnifiedEnvelope<T>
  if (
    envelope?.status === 'error'
    || envelope?.error === true
    || envelope?.success === false
  ) {
    throw new Error(String(envelope.message ?? `${platform} request failed`))
  }
  if (!envelope || !('data' in envelope)) {
    throw new Error(`${platform} returned no unified data`)
  }
  return envelope
}

export async function fetchUnifiedData<T>(
  platform: Platform,
  username: string,
  path = '',
  query?: Record<string, QueryValue>,
): Promise<T> {
  const envelope = await fetchUnifiedEnvelope<T>(platform, username, path, query)
  return envelope.data
}

export function asNumber(value: unknown, fallback = 0) {
  const next = Number(value)
  return Number.isFinite(next) ? next : fallback
}

export interface WindowedUnifiedHeatmap extends UnifiedHeatmap {
  availableYears: number[]
  startDate: string
  endDate: string
  view?: string
  year?: number | null
}

function isoToday() {
  return new Date().toISOString().slice(0, 10)
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function dayDiff(a: string, b: string) {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000)
}

function longestStreak(activeDates: string[]) {
  let longest = 0
  let current = 0
  let previous: string | null = null

  for (const date of activeDates) {
    current = previous && dayDiff(previous, date) === 1 ? current + 1 : 1
    longest = Math.max(longest, current)
    previous = date
  }

  return longest
}

function currentStreak(activeSet: Set<string>) {
  let cursor = new Date(`${isoToday()}T00:00:00Z`)
  if (!activeSet.has(isoDate(cursor))) cursor = addDays(cursor, -1)

  let current = 0
  while (activeSet.has(isoDate(cursor))) {
    current += 1
    cursor = addDays(cursor, -1)
  }
  return current
}

export function windowUnifiedHeatmap(
  heatmap: UnifiedHeatmap,
  options: { view?: string; range?: string; year?: number | null; days?: number } = {},
): WindowedUnifiedHeatmap {
  const activeDays = [...(heatmap.dailyContributions ?? [])].sort((a, b) => a.date.localeCompare(b.date))
  const availableYears = heatmap.availableYears?.length
    ? [...heatmap.availableYears].sort((a, b) => b - a)
    : heatmap.yearlyContributions?.length
      ? [...heatmap.yearlyContributions].map((y) => y.year).sort((a, b) => b - a)
      : [...new Set(activeDays.map((d) => Number(d.date.slice(0, 4))))].filter(Boolean).sort((a, b) => b - a)

  const mode = options.view ?? options.range ?? (options.days ? 'days' : 'all')
  const today = new Date(`${isoToday()}T00:00:00Z`)
  let startDate = activeDays[0]?.date ?? isoDate(addDays(today, -364))
  let endDate = activeDays.at(-1)?.date ?? isoDate(today)

  if (options.year != null || mode === 'year') {
    const year = options.year ?? availableYears[0] ?? today.getUTCFullYear()
    startDate = `${year}-01-01`
    endDate = `${year}-12-31`
  } else if (mode === 'last_365' || mode === 'last365days' || mode === 'days') {
    const days = options.days ?? 365
    startDate = isoDate(addDays(today, -(days - 1)))
    endDate = isoDate(today)
  }

  const dailyContributions = activeDays.filter((day) => day.date >= startDate && day.date <= endDate)
  const totalSubmissions = dailyContributions.reduce((total, day) => total + day.count, 0)
  const activeDates = dailyContributions.filter((day) => day.count > 0).map((day) => day.date)
  const activeSet = new Set(activeDates)
  const maxDailySubmissions = Math.max(0, ...dailyContributions.map((day) => day.count))

  return {
    ...heatmap,
    totalSubmissions,
    totalActiveDays: activeDates.length,
    currentStreak: currentStreak(activeSet),
    longestStreak: longestStreak(activeDates),
    maxDailySubmissions,
    firstActiveDate: activeDates[0] ?? null,
    lastActiveDate: activeDates.at(-1) ?? null,
    dailyContributions,
    availableYears,
    startDate,
    endDate,
    view: mode,
    year: options.year ?? null,
  }
}
