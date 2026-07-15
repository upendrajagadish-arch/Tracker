import { useMemo, useState, useRef, useEffect, cloneElement } from 'react'
import { SeoHead } from '@/components/SeoHead'
import { useQueryStates, parseAsString } from 'nuqs'
import { useQuery } from '@tanstack/react-query'
import { ActivityCalendar, type Activity } from 'react-activity-calendar'
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts'
import { Flame, Award, Link2, LogIn, UserCircle2 } from 'lucide-react'
import { Link, useNavigate } from '@tanstack/react-router'

import type { Platform, Usernames } from '@/types/api'
import type { PlatformCategory, UnifiedCard } from '@/types/unified'
import { useProfileCards } from '@/hooks/useCards'
import { fetchGitHubEngineering, type GitHubEngineering } from '@/api/github'
import { useAuth } from '@/hooks/useAuth'
import { getMyPublicProfile, savePrimaryProfileConfig } from '@/api/savedProfiles'
import { cn, shareOrCopyUrl, splitAccounts } from '@/lib/utils'
import { EMPTY_USERNAMES, usernamesToConfig } from '@/lib/profileConfig'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { PlatformIcon } from '@/components/PlatformIcon'
import { ShareFab } from '@/components/ShareFab'
import { ProfileLoader } from '@/components/ProfileLoader'
import { AppFooter } from '@/components/AppFooter'
import { BRAND_NAME, BRAND_SLUG } from '@/lib/brand'

const PLATFORM_COLORS: Record<string, string> = {
  github: 'var(--platform-github)',
  leetcode: 'var(--platform-leetcode)',
  codeforces: 'var(--platform-codeforces)',
  gfg: 'var(--platform-gfg)',
  codechef: 'var(--platform-codechef)',
  hackerrank: 'var(--platform-hackerrank)',
  tuf: 'var(--platform-tuf)',
}

const PLATFORM_LABELS: Record<string, string> = {
  github: 'GitHub',
  leetcode: 'LeetCode',
  codeforces: 'Codeforces',
  gfg: 'GeeksForGeeks',
  codechef: 'CodeChef',
  hackerrank: 'HackerRank',
  tuf: 'takeUforward',
}

const CATEGORY_LABELS: Record<PlatformCategory, string> = {
  dsa: 'DSA',
  competitive: 'Competitive',
  fundamentals: 'Fundamentals',
  development: 'Development',
}

const DIFFICULTY_TONES = {
  easy: '#57c785',
  medium: '#e2b93b',
  hard: '#e25c5c',
} as const

// Grayscale-to-indigo tones for the language distribution band.
const LANG_TONES = ['#e6e6ea', '#9aa0c7', '#7c83ff', '#5a5f9e', '#41456f', '#2e3050']

const sum = (ns: number[]) => ns.reduce((a, b) => a + b, 0)

// Typed link component for platform detail pages — TanStack Router requires
// parameterized routes to be called with explicit `to` + `params`.
function PlatformLink({ platform, username, children, className }: {
  platform: string
  username: string
  children: React.ReactNode
  className?: string
}) {
  const u = username
  switch (platform) {
    case 'github':     return <Link to="/github/$username"     params={{ username: u }} className={className}>{children}</Link>
    case 'leetcode':   return <Link to="/leetcode/$username"   params={{ username: u }} className={className}>{children}</Link>
    case 'codeforces': return <Link to="/codeforces/$username" params={{ username: u }} className={className}>{children}</Link>
    case 'gfg':        return <Link to="/gfg/$username"        params={{ username: u }} className={className}>{children}</Link>
    case 'codechef':   return <Link to="/codechef/$username"   params={{ username: u }} className={className}>{children}</Link>
    case 'hackerrank': return <Link to="/hackerrank/$username" params={{ username: u }} className={className}>{children}</Link>
    case 'tuf':        return <Link to="/tuf/$username"        params={{ username: u }} className={className}>{children}</Link>
    default:           return <>{children}</>
  }
}

// Measures its own width via ResizeObserver and hands an explicit pixel width
// to the chart. recharts' ResponsiveContainer measures 0 under React 19
// StrictMode's double-mount and stays blank, so we size charts ourselves.
function MeasuredChart({ height, children }: {
  height: number
  children: (width: number) => React.ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = (w: number) => { if (w > 0) setWidth(w) }
    update(el.getBoundingClientRect().width)
    const ro = new ResizeObserver((entries) => update(entries[0].contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return (
    <div ref={ref} className="w-full" style={{ height }}>
      {width > 0 ? children(width) : null}
    </div>
  )
}

// Custom radar axis label: anchor + offset based on the vertex position so
// adjacent platform names don't overlap the plot.
function PolarTick(props: {
  x?: number; y?: number; cx?: number; cy?: number; payload?: { value?: string }
}) {
  const { x = 0, y = 0, cx = 0, cy = 0, payload } = props
  const dx = x - cx
  const dy = y - cy
  const anchor = Math.abs(dx) < 14 ? 'middle' : dx > 0 ? 'start' : 'end'
  const ox = anchor === 'start' ? 6 : anchor === 'end' ? -6 : 0
  const oy = dy < -4 ? -6 : dy > 4 ? 12 : 4
  return (
    <text
      x={x + ox}
      y={y + oy}
      textAnchor={anchor}
      fontSize={10}
      fontFamily="JetBrains Mono, monospace"
      fill="#8a8a92"
    >
      {payload?.value}
    </text>
  )
}

// ── Editorial building blocks ────────────────────────────────────

function SectionHead({ n, title, note }: { n: string; title: string; note?: string }) {
  return (
    <div className="mb-8 flex items-center gap-3">
      <span className="glow-text shrink-0 font-pixel text-sm text-[var(--term-green)]">{n}</span>
      <h2 className="shrink-0 font-heading text-lg font-semibold tracking-tight text-foreground">
        <span className="text-muted-foreground/40">## </span>
        {title.replace(/ /g, '_')}
      </h2>
      <span className="ascii-rule" />
      {note && (
        <span className="hidden shrink-0 font-mono text-[10px] text-muted-foreground/60 md:block">
          {'// '}{note}
        </span>
      )}
    </div>
  )
}

function Figure({ value, label, sub, accent }: {
  value: number | string
  label: string
  sub?: string
  accent?: boolean
}) {
  return (
    <div>
      <p
        className={cn(
          'font-pixel text-4xl leading-none md:text-[3rem]',
          accent ? 'glow-text text-primary' : 'text-foreground',
        )}
      >
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      <p className="mt-2.5 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </p>
      {sub && (
        <p className="mt-1 font-mono text-[10px] text-muted-foreground/50">{sub}</p>
      )}
    </div>
  )
}

function MicroLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">
      <span className="text-[var(--term-green)]">&gt; </span>{children}
    </p>
  )
}

interface ProfilePageProps {
  usernames?: Usernames
  owner?: {
    username: string
    displayName: string | null
    avatarUrl: string | null
  }
  mode?: 'default' | 'placement'
  backTo?: { to: string; label: string }
  subtitle?: string | null
  profileLabel?: string
  hideShare?: boolean
  hideFooter?: boolean
  /** Cached cards for public share views — skips live platform fetches. */
  prefetchedCards?: UnifiedCard[]
  /** Minimal public share layout without dashboard navigation. */
  publicView?: boolean
}

export function ProfilePage({
  usernames: savedUsernames,
  owner,
  mode = 'default',
  backTo,
  subtitle,
  profileLabel,
  hideShare = false,
  hideFooter = false,
  prefetchedCards,
  publicView = false,
}: ProfilePageProps = {}) {
  const [query] = useQueryStates({
    github: parseAsString.withDefault(''),
    leetcode: parseAsString.withDefault(''),
    codeforces: parseAsString.withDefault(''),
    gfg: parseAsString.withDefault(''),
    codechef: parseAsString.withDefault(''),
    hackerrank: parseAsString.withDefault(''),
    tuf: parseAsString.withDefault(''),
  })

  const profileUsernames = savedUsernames ?? { ...EMPTY_USERNAMES, ...query }
  const usePrefetched = Boolean(prefetchedCards?.length)

  const { cards: fetchedCards, loaded: fetchedLoaded, isLoading: fetchingCards, activeCount: fetchedActiveCount } =
    useProfileCards(usePrefetched ? {} : profileUsernames)

  const loaded = usePrefetched ? prefetchedCards! : fetchedLoaded
  const isLoading = usePrefetched ? false : fetchingCards
  const activeCount = usePrefetched
    ? prefetchedCards!.length
    : fetchedActiveCount

  const cards = usePrefetched
    ? prefetchedCards!.map((card) => ({
        platform: card.platform as Platform,
        username: card.username,
        card,
        isLoading: false,
        isError: false,
        error: null,
      }))
    : fetchedCards

  const activeHandles = useMemo(
    () => cards.map((c) => [c.platform, c.username] as [Platform, string]),
    [cards],
  )

  // ── Split the two worlds up front ────────────────────────────
  // Development (GitHub) reports *commits* under `stats.totalSolved`. Those are
  // a fundamentally different unit from competitive-programming problems solved,
  // so we never mix them: coding cards drive "problems solved", dev cards drive
  // their own commit/PR metrics.
  const devCards = useMemo(() => loaded.filter((c) => c.category === 'development'), [loaded])
  const codingCards = useMemo(() => loaded.filter((c) => c.category !== 'development'), [loaded])

  // Platforms with several stacked accounts — rows for these show the handle
  // so same-platform entries stay tellable apart.
  const multiPlatforms = useMemo(() => {
    const counts = new Map<string, number>()
    loaded.forEach((c) => counts.set(c.platform, (counts.get(c.platform) ?? 0) + 1))
    return new Set([...counts].filter(([, n]) => n > 1).map(([p]) => p))
  }, [loaded])

  // ── Headline figures ─────────────────────────────────────────
  const totalSolved = sum(codingCards.map((c) => c.stats.totalSolved))
  const totalCommits = sum(devCards.map((c) => c.stats.byDifficulty.commits ?? c.stats.totalSolved))
  const totalActiveDays = sum(loaded.map((c) => c.heatmap.totalActiveDays))
  const totalContests = sum(loaded.map((c) => c.contests.count))
  const bestStreak = Math.max(0, ...loaded.map((c) => c.heatmap.longestStreak))
  const currentStreak = Math.max(0, ...loaded.map((c) => c.heatmap.currentStreak))
  const totalBadges = sum(loaded.map((c) => c.badges.count))

  // ── GitHub dev data ──────────────────────────────────────────
  // PRs / stars / orgs live outside the unified card endpoints, so pull them
  // separately and sum across stacked accounts. (The GitHub Stats API exposes
  // no issues count.)
  const githubAccounts = useMemo(() => splitAccounts(profileUsernames.github), [profileUsernames.github])
  const { data: ghEng } = useQuery({
    queryKey: ['github-engineering', githubAccounts.join(',')],
    queryFn: async (): Promise<GitHubEngineering> => {
      const all = await Promise.all(githubAccounts.map(fetchGitHubEngineering))
      return all.reduce((acc, e) => ({
        prsTotal: acc.prsTotal + e.prsTotal,
        prsMerged: acc.prsMerged + e.prsMerged,
        prsOpen: acc.prsOpen + e.prsOpen,
        stars: acc.stars + e.stars,
        orgs: acc.orgs + e.orgs,
      }), { prsTotal: 0, prsMerged: 0, prsOpen: 0, stars: 0, orgs: 0 })
    },
    enabled: githubAccounts.length > 0 && !usePrefetched,
    staleTime: 45 * 60 * 1000,
  })

  const devStats = useMemo(() => {
    if (!devCards.length) return null
    // Language shares are percentages per account. Some GitHub accounts have no
    // public repo language data because their repos are private, so exclude only
    // those accounts instead of diluting the average across all stacked accounts.
    const languageCards = devCards.filter((c) => sum(c.stats.topicAnalysis.map((l) => l.count)) > 0)
    const langMap = new Map<string, number>()
    languageCards.forEach((c) =>
      c.stats.topicAnalysis.forEach((l) => langMap.set(l.topic, (langMap.get(l.topic) ?? 0) + l.count)),
    )
    const languages = languageCards.length === 0
      ? []
      : [...langMap.entries()]
          .map(([topic, total]) => ({ topic, count: Math.round(total / languageCards.length) }))
          .filter((l) => l.count >= 1)
          .sort((a, b) => b.count - a.count)
    return {
      commits: totalCommits,
      prs: ghEng?.prsTotal ?? 0,
      prsMerged: ghEng?.prsMerged ?? 0,
      stars: ghEng?.stars ?? 0,
      orgs: ghEng?.orgs ?? 0,
      languages,
    }
  }, [devCards, totalCommits, ghEng])

  // ── Ledger clusters: problem solving / engineering / consistency ─
  // Problems solved and commits live in separate, explicitly-labelled ledgers
  // so the two units can never be read as one combined number.
  const clusters = useMemo(() => {
    const list: { label: string; figures: { value: number | string; label: string; accent?: boolean }[] }[] = []
    if (codingCards.length) {
      list.push({
        label: 'Problem Solving',
        figures: [
          { value: totalSolved, label: 'problems solved', accent: true },
          { value: totalContests, label: 'contests' },
        ],
      })
    }
    if (devCards.length) {
      list.push({
        label: 'Engineering',
        figures: [
          { value: totalCommits, label: 'commits' },
          ...(devStats && devStats.prs > 0 ? [{ value: devStats.prs, label: 'pull requests' }] : []),
        ],
      })
    }
    list.push({
      label: 'Consistency',
      figures: [
        { value: totalActiveDays, label: 'active days' },
        { value: `${bestStreak}d`, label: `best streak · now ${currentStreak}d` },
      ],
    })
    return list
  }, [codingCards.length, devCards.length, totalSolved, totalContests, totalCommits, devStats, totalActiveDays, bestStreak, currentStreak])

  // ── Category buckets (problem-solving only — commits excluded) ─
  const byCategory = useMemo(() => {
    const groups: Record<PlatformCategory, number> = {
      dsa: 0, competitive: 0, fundamentals: 0, development: 0,
    }
    codingCards.forEach((c) => { groups[c.category] += c.stats.totalSolved })
    return groups
  }, [codingCards])

  // ── DSA difficulty (coding platforms only) ───────────────────
  const difficulty = useMemo(() => {
    const acc = { easy: 0, medium: 0, hard: 0 }
    codingCards.forEach((c) => {
      acc.easy += c.stats.byDifficulty.easy ?? 0
      acc.medium += c.stats.byDifficulty.medium ?? 0
      acc.hard += c.stats.byDifficulty.hard ?? 0
    })
    return acc
  }, [codingCards])
  const difficultyTotal = difficulty.easy + difficulty.medium + difficulty.hard

  // ── Topics merged (coding platforms only) ────────────────────
  // GitHub's topicAnalysis carries language *percentages*, not problems solved —
  // merging those into solve counts would be meaningless, so dev cards are
  // excluded here and surfaced separately in the Engineering section.
  const topics = useMemo(() => {
    const map = new Map<string, number>()
    codingCards.forEach((c) =>
      c.stats.topicAnalysis.forEach((t) => map.set(t.topic, (map.get(t.topic) ?? 0) + t.count)),
    )
    return [...map.entries()]
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 14)
  }, [codingCards])

  // ── Contest rows: rating + rank + history chart per platform ─
  // rating.history is the primary series; contests.history fills in when a
  // platform reports contests but no rating timeline, so every rating platform
  // gets a graph (a single contest renders as a lone point).
  const contestRows = useMemo(() => {
    return loaded
      .filter((c) => c.contests.rating != null || c.contests.rank)
      .map((c) => {
        const primary = (c.rating.history ?? [])
          .filter((p) => p.rating != null)
          .map((p, i) => ({
            i,
            rating: p.rating!,
            name: p.contestName ?? `Contest ${i + 1}`,
          }))
        const fallback = (c.contests.history ?? [])
          .filter((h) => h.rating != null)
          .sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0))
          .map((h, i) => ({
            i,
            rating: Math.round(h.rating!),
            name: h.name ?? `Contest ${i + 1}`,
          }))
        const points = primary.length >= fallback.length ? primary : fallback
        return {
          platform: c.platform,
          username: c.username,
          rating: c.contests.rating ?? c.rating.current,
          max: c.contests.maxRating ?? c.rating.max,
          rank: c.contests.rank,
          count: c.contests.count,
          globalRanking: c.contests.globalRanking,
          color: PLATFORM_COLORS[c.platform],
          points: points.length > 0 ? points : null,
        }
      })
  }, [loaded])

  // ── Radar: relative engagement across coding platforms only ──
  // Competitive platforms are scored by rating, DSA platforms by problems
  // solved. The two units are normalized independently (each against its own
  // strongest platform) — a 2000 rating must not flatten a 165-solved axis.
  const radarData = useMemo(() => {
    // Stacked accounts merge into one axis per platform: solved counts add up,
    // ratings take the strongest account.
    const byPlatform = new Map<string, { subject: string; raw: number; label: string }>()
    codingCards.forEach((c) => {
      const isCompetitive = c.category === 'competitive'
      const raw = Math.round(
        isCompetitive
          ? (c.contests.rating ?? c.contests.maxRating ?? 0)
          : c.stats.totalSolved,
      )
      const prev = byPlatform.get(c.platform)
      byPlatform.set(c.platform, {
        subject: PLATFORM_LABELS[c.platform],
        raw: prev ? (isCompetitive ? Math.max(prev.raw, raw) : prev.raw + raw) : raw,
        label: isCompetitive ? 'rating' : 'solved',
      })
    })
    const entries = [...byPlatform.values()]
    if (entries.length < 3) return []
    const maxBy = (label: string) =>
      Math.max(...entries.filter((e) => e.label === label).map((e) => e.raw), 1)
    const maxRating = maxBy('rating')
    const maxSolved = maxBy('solved')
    return entries.map((e) => ({
      ...e,
      value: Math.round((e.raw / (e.label === 'rating' ? maxRating : maxSolved)) * 100),
    }))
  }, [codingCards])

  // ── Badges across platforms ──────────────────────────────────
  const badgePlatforms = useMemo(
    () => loaded.filter((c) => c.badges.count > 0 || c.badges.list?.length > 0),
    [loaded],
  )

  // ── Unified heatmap: source (all / coding / github) + window ─
  // Card heatmaps carry the *full* history (the APIs default to view=all), so
  // both the year selector and the source split are pure client-side windows.
  const [heatSource, setHeatSource] = useState<'all' | 'coding' | 'github'>('all')
  const [heatRange, setHeatRange] = useState<number | 'last365'>('last365')

  const heatmapYears = useMemo(() => {
    const years = new Set<number>()
    loaded.forEach((c) => {
      c.heatmap.availableYears?.forEach((y) => years.add(y))
      c.heatmap.yearlyContributions?.forEach((y) => years.add(y.year))
    })
    if (!years.size) {
      loaded.forEach((c) =>
        c.heatmap.dailyContributions.forEach((d) => years.add(Number(d.date.slice(0, 4)))),
      )
    }
    return [...years].filter(Boolean).sort((a, b) => b - a)
  }, [loaded])

  const heatCards = heatSource === 'coding' ? codingCards : heatSource === 'github' ? devCards : loaded

  const { unifiedHeatmap, breakdownByDate } = useMemo(() => {
    const dateMap = new Map<string, number>()
    // date -> [{ platform, username, count }] for the per-account hover breakdown
    const breakdown = new Map<string, { platform: string; username: string; count: number }[]>()
    heatCards.forEach((c) =>
      c.heatmap.dailyContributions.forEach((d) => {
        if (d.count <= 0) return
        dateMap.set(d.date, (dateMap.get(d.date) ?? 0) + d.count)
        const arr = breakdown.get(d.date) ?? []
        arr.push({ platform: c.platform, username: c.username, count: d.count })
        breakdown.set(d.date, arr)
      }),
    )

    const today = new Date()
    let start: Date
    let end: Date
    if (heatRange === 'last365') {
      end = today
      start = new Date(today)
      start.setFullYear(today.getFullYear() - 1)
      start.setDate(start.getDate() + 1)
    } else {
      start = new Date(heatRange, 0, 1)
      end = heatRange === today.getFullYear() ? today : new Date(heatRange, 11, 31)
    }

    const activities: Activity[] = []
    const cursor = new Date(start)
    while (cursor <= end) {
      const dateStr = cursor.toISOString().split('T')[0]
      const count = dateMap.get(dateStr) ?? 0
      let level = 0
      if (count >= 1) level = 1
      if (count >= 3) level = 2
      if (count >= 6) level = 3
      if (count >= 10) level = 4
      activities.push({ date: dateStr, count, level })
      cursor.setDate(cursor.getDate() + 1)
    }
    return { unifiedHeatmap: activities, breakdownByDate: breakdown }
  }, [heatCards, heatRange])

  const heatCountLabel = heatSource === 'coding'
    ? '{{count}} submissions across coding platforms'
    : heatSource === 'github'
      ? '{{count}} contributions on GitHub'
      : '{{count}} contributions across all platforms'

  // ── Heatmap hover tooltip ─────────────────────────────────────
  const heatmapRef = useRef<HTMLDivElement>(null)
  const [hoveredDay, setHoveredDay] = useState<{ activity: Activity; x: number; y: number } | null>(null)

  // ── Profile source ───────────────────────────────────────────
  const profileSource = useMemo(
    () => loaded.find((c) => c.profile.avatar || c.profile.displayName),
    [loaded],
  )
  const profileAvatar = owner?.avatarUrl ?? profileSource?.profile.avatar ?? ''
  const profileName =
    owner?.displayName ||
    loaded.find((c) => c.profile.displayName)?.profile.displayName ||
    activeHandles[0]?.[1] || 'Coder'
  const institution = loaded.find((c) => c.profile.institution)?.profile.institution ?? null

  // ── Share ────────────────────────────────────────────────────
  const navigate = useNavigate()
  const { user } = useAuth()
  const [shareToast, setShareToast] = useState<{ text: string; tone: 'success' | 'error' } | null>(null)
  const [isSavingShort, setIsSavingShort] = useState(false)

  // Long URL — the current location, params and all.
  const handleShareLong = async () => {
    const result = await shareOrCopyUrl(window.location.href, `${profileName} — ${BRAND_NAME}`)
    if (result === 'copied') setShareToast({ text: 'Link copied', tone: 'success' })
    if (result === 'failed') setShareToast({ text: 'Copy failed', tone: 'error' })
  }

  // Short URL — publish these params as the signed-in user's saved config and
  // copy /<userid>. Users without a userid detour through /account and return.
  const handleShortUrl = async () => {
    setIsSavingShort(true)
    try {
      const profile = await getMyPublicProfile()
      if (!profile) {
        navigate({
          to: '/account',
          search: { next: `${window.location.pathname}${window.location.search}` },
        })
        return
      }
      await savePrimaryProfileConfig(usernamesToConfig(profileUsernames))
      const url = `${window.location.origin}/${profile.username}`
      await navigator.clipboard?.writeText(url).catch(() => undefined)
      setShareToast({ text: `Short url copied · /${profile.username}`, tone: 'success' })
    } catch (err) {
      setShareToast({ text: err instanceof Error ? err.message : String(err), tone: 'error' })
    } finally {
      setIsSavingShort(false)
    }
  }

  // Sections are numbered in render order; conditional sections simply don't
  // consume a number, so the sequence never gaps.
  let sectionCount = 0
  const nextSection = () => String(++sectionCount).padStart(2, '0')

  if (activeCount === 0) {
    return (
      <>
        <SeoHead title="Profile" url="https://codetrace.xyz/profile" />
        <div className="fade-in flex min-h-[60vh] items-center justify-center px-5">
        <div className="term-window scanlines w-full max-w-md">
          <div className="term-bar">
            <span className="term-dot" style={{ background: 'var(--term-red)' }} />
            <span className="term-dot" style={{ background: 'var(--term-amber)' }} />
            <span className="term-dot" style={{ background: 'var(--term-green)' }} />
            <span className="ml-2 font-mono text-[11px] text-muted-foreground/80">~/profile — error</span>
          </div>
          <div className="crt-grid px-7 py-9 text-center">
            <p className="glow-text font-pixel text-5xl text-primary">404</p>
            <p className="mt-4 font-mono text-sm text-muted-foreground">
              <span className="text-[var(--term-green)]">$</span> no profiles mounted
            </p>
            <Button asChild variant="outline" className="mt-6 rounded-md font-mono text-xs">
              <Link to="/app">cd ~/dashboard</Link>
            </Button>
          </div>
        </div>
      </div>
      </>
    )
  }

  const isPlacement = mode === 'placement'
  const navBack = publicView ? null : backTo ?? (isPlacement ? null : { to: '/app', label: 'cd ../results' })
  const headerBadge = profileLabel ?? (isPlacement ? 'student profile' : `${BRAND_SLUG} · student profile`)
  const topRightLabel = isPlacement
    ? (profileLabel ?? 'student profile')
    : owner
      ? `@${owner.username}`
      : headerBadge

  return (
    <>
      <SeoHead
        title={profileName}
        description={`Unified developer profile for ${profileName} — coding stats across GitHub, LeetCode, Codeforces, and more.`}
        url="https://codetrace.xyz/profile"
        type="profile"
      />
      <div className="fade-in px-4 py-8 sm:px-6 md:px-8">
      <div className="app-stack mx-auto max-w-4xl">

        {/* ── Top bar ───────────────────────────────────────── */}
        <nav className="flex items-center justify-between font-mono text-[11px]">
          {navBack ? (
            <Link
              to={navBack.to}
              className="prompt inline-flex items-center uppercase tracking-[0.15em] text-muted-foreground transition-colors hover:text-primary"
            >
              {navBack.label}
            </Link>
          ) : (
            <span />
          )}
          <span className="uppercase tracking-[0.2em] text-muted-foreground/60">
            {topRightLabel}
          </span>
        </nav>

        {/* ── Masthead — a terminal window titled with the profile path ── */}
        <header className="rise-in term-window crt-grid scanlines">
          <div className="term-bar">
            <span className="term-dot" style={{ background: 'var(--term-red)' }} />
            <span className="term-dot" style={{ background: 'var(--term-amber)' }} />
            <span className="term-dot" style={{ background: 'var(--term-green)' }} />
            <span className="ml-2 truncate font-mono text-[11px] text-muted-foreground/80">
              {isPlacement
                ? `~/student-profile/${profileName.toLowerCase().replace(/\s+/g, '-')}`
                : `~/profile/${profileName.toLowerCase().replace(/\s+/g, '-')}`}
            </span>
          </div>

          <div className="grid grid-cols-[1fr_auto] items-start gap-6 px-6 py-8 md:px-9 md:py-9">
            <div className="min-w-0">
              {isLoading && !profileSource ? (
                <Skeleton className="h-14 w-64" />
              ) : (
                <h1
                  className="glitch glow-text font-pixel text-[2.3rem] leading-[1.05] text-foreground md:text-5xl"
                  data-text={profileName}
                >
                  {profileName}
                </h1>
              )}
              {subtitle ? (
                <p className="mt-3 font-mono text-sm text-primary">{subtitle}</p>
              ) : null}
              {institution && (
                <p className="mt-4 max-w-md font-mono text-xs leading-relaxed text-muted-foreground">
                  <span className="text-[var(--term-green)]"># </span>{institution}
                </p>
              )}
              <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2">
                {activeHandles.map(([platform, username]) => (
                  <PlatformLink
                    key={`${platform}-${username}`}
                    platform={platform}
                    username={username}
                    className="inline-flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <span
                      className="size-1.5 rounded-full"
                      style={{ background: PLATFORM_COLORS[platform] }}
                    />
                    <span className="text-muted-foreground/45">origin/</span>{platform}
                    <span className="text-muted-foreground/35">·</span>@{username}
                  </PlatformLink>
                ))}
              </div>
            </div>
            <Avatar className="size-20 rounded-lg border border-border/80 md:size-24">
              <AvatarImage src={profileAvatar} className="rounded-lg" />
              <AvatarFallback className="rounded-lg font-pixel text-2xl">
                {profileName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* ── Ledger: headline figures in labelled clusters ─── */}
        {isLoading && loaded.length === 0 ? (
          <div className="mt-12 border-y border-border/60 py-10">
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <>
            <div
              className={cn(
                'rise-in mt-12 grid gap-x-10 gap-y-10 border-y border-border/60 py-10',
                clusters.length === 3 && 'md:grid-cols-3',
                clusters.length === 2 && 'md:grid-cols-2',
                'md:[&>*+*]:border-l md:[&>*+*]:border-border/60 md:[&>*+*]:pl-10',
              )}
              style={{ animationDelay: '60ms' }}
            >
              {clusters.map((cl) => (
                <div key={cl.label}>
                  <MicroLabel>{cl.label}</MicroLabel>
                  <div className="flex flex-wrap gap-x-10 gap-y-6">
                    {cl.figures.map((f) => (
                      <Figure key={f.label} value={f.value} label={f.label} accent={f.accent} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {devCards.length > 0 && codingCards.length > 0 && (
              <p className="mt-3 font-mono text-[10px] tracking-wide text-muted-foreground/50">
                Commits and pull requests are engineering output — never mixed into problems solved.
              </p>
            )}
          </>
        )}

        {/* ── Problem solving ───────────────────────────────── */}
        {codingCards.length > 0 && (
          <section className="rise-in mt-20" style={{ animationDelay: '120ms' }}>
            <SectionHead n={nextSection()} title="problem solving" note="coding platforms only" />

            <div className={cn(
              'grid gap-x-16 gap-y-12',
              radarData.length > 0 && 'md:grid-cols-[minmax(0,1fr)_minmax(0,320px)]',
            )}>
              <div className="min-w-0 space-y-12">
                {/* Category counts */}
                <div className="flex flex-wrap gap-x-12 gap-y-6">
                  {(Object.keys(CATEGORY_LABELS) as PlatformCategory[])
                    .filter((cat) => byCategory[cat] > 0)
                    .map((cat) => (
                      <div key={cat}>
                        <p className="font-pixel text-3xl leading-none text-foreground">
                          {byCategory[cat].toLocaleString()}
                        </p>
                        <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                          {CATEGORY_LABELS[cat]}
                        </p>
                      </div>
                    ))}
                </div>

                {/* Difficulty split as a single segmented band */}
                {difficultyTotal > 0 && (
                  <div>
                    <MicroLabel>Difficulty</MicroLabel>
                    <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                      {(['easy', 'medium', 'hard'] as const).map((d) => (
                        difficulty[d] > 0 && (
                          <div
                            key={d}
                            style={{
                              width: `${(difficulty[d] / difficultyTotal) * 100}%`,
                              background: DIFFICULTY_TONES[d],
                            }}
                          />
                        )
                      ))}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 font-mono text-[11px]">
                      {(['easy', 'medium', 'hard'] as const).map((d) => (
                        <span key={d} className="inline-flex items-center gap-2 text-muted-foreground">
                          <span className="size-1.5 rounded-full" style={{ background: DIFFICULTY_TONES[d] }} />
                          <span className="capitalize">{d}</span>
                          <span className="text-foreground">{difficulty[d]}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Relative engagement radar across coding platforms */}
              {radarData.length > 0 && (
                <div className="min-w-0">
                  <MicroLabel>Relative engagement</MicroLabel>
                  <MeasuredChart height={260}>
                    {(width) => (
                      <RadarChart
                        width={width}
                        height={260}
                        cx="50%"
                        cy="50%"
                        outerRadius="66%"
                        data={radarData}
                        margin={{ top: 16, right: 42, bottom: 16, left: 42 }}
                      >
                        <PolarGrid stroke="rgba(255,255,255,0.09)" />
                        <PolarAngleAxis dataKey="subject" tick={<PolarTick />} />
                        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar
                          dataKey="value"
                          stroke="var(--color-primary)"
                          strokeWidth={1.5}
                          fill="var(--color-primary)"
                          fillOpacity={0.16}
                        />
                        <Tooltip
                          content={({ payload }) => {
                            if (!payload?.length) return null
                            const d = payload[0].payload
                            return (
                              <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-lg">
                                <p className="font-medium">{d.subject}</p>
                                <p className="font-mono text-muted-foreground">
                                  {d.label} <span className="text-primary">{d.raw.toLocaleString()}</span>
                                </p>
                              </div>
                            )
                          }}
                        />
                      </RadarChart>
                    )}
                  </MeasuredChart>
                </div>
              )}
            </div>

            {/* Topics as flowing text */}
            {topics.length > 0 && (
              <div className="mt-12">
                <MicroLabel>Recurring topics</MicroLabel>
                <p className="max-w-3xl leading-[2.1]">
                  {topics.map((t, i) => (
                    <span key={t.topic}>
                      <span className="whitespace-nowrap">
                        <span className="text-sm text-foreground/85">{t.topic}</span>
                        <span className="ml-1.5 font-mono text-[11px] text-primary">{t.count}</span>
                      </span>
                      {/* the space provides a wrap opportunity between topics */}
                      {i < topics.length - 1 && (
                        <span className="mx-2.5 text-muted-foreground/30">{' / '}</span>
                      )}
                    </span>
                  ))}
                </p>
              </div>
            )}
          </section>
        )}

        {/* ── Contests & ratings ────────────────────────────── */}
        {contestRows.length > 0 && (
          <section className="rise-in mt-20" style={{ animationDelay: '160ms' }}>
            <SectionHead n={nextSection()} title="contests & ratings" />
            <div className="divide-y divide-border/50">
              {contestRows.map((row) => (
                <div key={`${row.platform}-${row.username}`} className="py-7 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
                    <div className="flex items-center gap-3.5">
                      <span
                        className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border/70"
                      >
                        <PlatformIcon platform={row.platform} className="size-4" />
                      </span>
                      <div>
                        <PlatformLink
                          platform={row.platform}
                          username={row.username}
                          className="text-sm font-medium text-foreground underline-offset-4 transition-colors hover:text-primary hover:underline"
                        >
                          {PLATFORM_LABELS[row.platform]}
                          {multiPlatforms.has(row.platform) && (
                            <span className="ml-2 font-mono text-[11px] font-normal text-muted-foreground">
                              {row.username}
                            </span>
                          )}
                        </PlatformLink>
                        <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                          {[
                            row.rank,
                            row.count > 0 ? `${row.count} contest${row.count === 1 ? '' : 's'}` : null,
                            row.max != null ? `max ${Math.round(row.max)}` : null,
                            row.globalRanking != null ? `#${row.globalRanking.toLocaleString()} global` : null,
                          ].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                    </div>
                    <p className="font-pixel text-4xl leading-none text-foreground">
                      {row.rating != null ? Math.round(row.rating) : '—'}
                    </p>
                  </div>

                  {row.points && (
                    <div className="mt-4">
                      <MeasuredChart height={84}>
                        {(width) => (
                          <LineChart
                            width={width}
                            height={84}
                            data={row.points!}
                            margin={{ top: 6, right: 2, bottom: 2, left: 2 }}
                          >
                            <XAxis dataKey="i" hide />
                            <YAxis domain={['auto', 'auto']} hide />
                            <Tooltip
                              content={({ payload }) => {
                                if (!payload?.length) return null
                                const d = payload[0].payload
                                return (
                                  <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-lg">
                                    <p className="max-w-[200px] truncate text-muted-foreground">{d.name}</p>
                                    <p className="font-mono font-bold text-foreground">{d.rating}</p>
                                  </div>
                                )
                              }}
                            />
                            <Line
                              type="monotone"
                              dataKey="rating"
                              stroke={row.color}
                              strokeWidth={1.5}
                              strokeOpacity={0.9}
                              // sparse histories (even a single contest) render as
                              // visible points; dense ones as a clean line
                              dot={row.points!.length <= 12 ? { r: 2.5, fill: row.color, strokeWidth: 0 } : false}
                              activeDot={{ r: 3, fill: row.color, strokeWidth: 0 }}
                            />
                          </LineChart>
                        )}
                      </MeasuredChart>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Platform index (dot leaders) ───────────────────── */}
        {loaded.length > 0 && (
          <section className="rise-in mt-20" style={{ animationDelay: '200ms' }}>
            <SectionHead n={nextSection()} title="platform index" note="click through for detail" />
            <div className="divide-y divide-border/40">
              {loaded.map((c) => {
                const isDev = c.category === 'development'
                const metric = isDev ? 'commits' : c.category === 'competitive' ? 'rating' : 'solved'
                const value = c.category === 'competitive'
                  ? (c.contests.rating != null ? Math.round(c.contests.rating) : c.stats.totalSolved)
                  : c.stats.totalSolved
                const subParts = [
                  c.contests.rank,
                  c.category === 'dsa' && (c.stats.byDifficulty.easy || c.stats.byDifficulty.medium || c.stats.byDifficulty.hard)
                    ? `E ${c.stats.byDifficulty.easy ?? 0} · M ${c.stats.byDifficulty.medium ?? 0} · H ${c.stats.byDifficulty.hard ?? 0}`
                    : null,
                  c.heatmap.currentStreak > 0 ? `${c.heatmap.currentStreak}d streak` : null,
                  c.heatmap.totalActiveDays > 0 ? `${c.heatmap.totalActiveDays} active days` : null,
                ].filter(Boolean)

                return (
                  <PlatformLink key={`${c.platform}-${c.username}`} platform={c.platform} username={c.username} className="group block">
                    <div className="flex items-center py-4">
                      <span
                        className="mr-3 size-1.5 shrink-0 rounded-full"
                        style={{ background: PLATFORM_COLORS[c.platform] }}
                      />
                      <span className="text-sm font-medium text-foreground transition-colors group-hover:text-primary">
                        {PLATFORM_LABELS[c.platform]}
                      </span>
                      {multiPlatforms.has(c.platform) && (
                        <span className="ml-2 font-mono text-[11px] text-muted-foreground">{c.username}</span>
                      )}
                      <span className="ml-3 hidden truncate font-mono text-[10px] text-muted-foreground/70 sm:inline">
                        {subParts.join(' · ')}
                      </span>
                      <span className="dot-leader" />
                      <span className="font-pixel text-2xl leading-none text-foreground">
                        {value.toLocaleString()}
                      </span>
                      <span className="ml-2 w-14 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                        {metric}
                      </span>
                    </div>
                  </PlatformLink>
                )
              })}
            </div>
          </section>
        )}

        {/* ── Engineering (GitHub) — kept apart from problems ── */}
        {devStats && (
          <section className="rise-in mt-20" style={{ animationDelay: '240ms' }}>
            <SectionHead n={nextSection()} title="engineering" note="github — counted apart" />

            <div className="flex flex-wrap gap-x-14 gap-y-8">
              {([
                { label: 'commits', value: devStats.commits },
                {
                  label: 'pull requests', value: devStats.prs,
                  sub: devStats.prsMerged > 0 ? `${devStats.prsMerged} merged` : undefined,
                },
                { label: 'stars earned', value: devStats.stars },
                { label: 'organisations', value: devStats.orgs },
              ] as { label: string; value: number; sub?: string }[]).filter((f) => f.value > 0).map((f) => (
                <Figure key={f.label} value={f.value} label={f.label} sub={f.sub} />
              ))}
            </div>

            {devStats.languages.length > 0 && (
              <div className="mt-12">
                <MicroLabel>Languages</MicroLabel>
                <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                  {devStats.languages.map((lang, i) => (
                    <div
                      key={lang.topic}
                      style={{
                        width: `${lang.count}%`,
                        background: LANG_TONES[i % LANG_TONES.length],
                      }}
                    />
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1.5 font-mono text-[11px]">
                  {devStats.languages.map((lang, i) => (
                    <span key={lang.topic} className="inline-flex items-center gap-2 text-muted-foreground">
                      <span
                        className="size-1.5 rounded-full"
                        style={{ background: LANG_TONES[i % LANG_TONES.length] }}
                      />
                      {lang.topic}
                      <span className="text-foreground">{lang.count}%</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* ── Honours ───────────────────────────────────────── */}
        {badgePlatforms.length > 0 && (
          <section className="rise-in mt-20" style={{ animationDelay: '280ms' }}>
            <SectionHead
              n={nextSection()}
              title="honours"
              note={`${totalBadges} across ${badgePlatforms.length} platform${badgePlatforms.length !== 1 ? 's' : ''}`}
            />
            <div className="space-y-8">
              {badgePlatforms.map((c) => (
                <div key={`${c.platform}-${c.username}`}>
                  <p className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground/70">
                    <PlatformIcon platform={c.platform} className="size-3" />
                    {PLATFORM_LABELS[c.platform]}
                    {multiPlatforms.has(c.platform) && (
                      <span className="normal-case tracking-normal opacity-70">{c.username}</span>
                    )}
                    <span className="text-primary">{c.badges.count}</span>
                  </p>
                  {c.badges.list.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {c.badges.list.slice(0, 10).map((b, i) => (
                        <span
                          key={b.id ?? i}
                          title={b.name ?? undefined}
                          className="inline-flex items-center gap-1.5 rounded-full border border-border/60 px-3 py-1.5 font-mono text-[10px] text-muted-foreground"
                        >
                          {b.icon ? (
                            <img src={b.icon} alt="" className="size-3.5 object-contain" />
                          ) : (
                            <Award className="size-3 text-primary/70" />
                          )}
                          <span className="max-w-[110px] truncate">{b.name}</span>
                        </span>
                      ))}
                      {c.badges.list.length > 10 && (
                        <span className="px-2 py-1.5 font-mono text-[10px] text-muted-foreground/60">
                          +{c.badges.list.length - 10} more
                        </span>
                      )}
                    </div>
                  ) : (
                    c.badges.active && (
                      <p className="text-sm text-muted-foreground">
                        {c.badges.active.name}
                        {c.badges.active.level && (
                          <span className="ml-2 font-mono text-[10px] opacity-60">{c.badges.active.level}</span>
                        )}
                      </p>
                    )
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── A year of activity ────────────────────────────── */}
        <section className="rise-in mt-20 pb-6" style={{ animationDelay: '320ms' }}>
          <SectionHead
            n={nextSection()}
            title="activity"
            note={heatRange === 'last365' ? 'trailing 365 days' : String(heatRange)}
          />

          {/* Source + window controls */}
          <div className="mb-8 flex flex-wrap items-center justify-between gap-x-8 gap-y-4">
            {devCards.length > 0 && codingCards.length > 0 ? (
              <div className="flex gap-5 font-mono text-[10px] uppercase tracking-[0.18em]">
                {([
                  ['all', 'combined'],
                  ['coding', 'problem solving'],
                  ['github', 'engineering'],
                ] as const).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setHeatSource(key)}
                    className={cn(
                      'border-b pb-1 transition-colors',
                      heatSource === key
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground/60 hover:text-foreground',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            ) : <span />}

            {heatmapYears.length > 0 && (
              <div className="flex flex-wrap gap-4 font-mono text-[10px] uppercase tracking-[0.18em]">
                <button
                  onClick={() => setHeatRange('last365')}
                  className={cn(
                    'border-b pb-1 transition-colors',
                    heatRange === 'last365'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground/60 hover:text-foreground',
                  )}
                >
                  Last 365
                </button>
                {heatmapYears.map((y) => (
                  <button
                    key={y}
                    onClick={() => setHeatRange(y)}
                    className={cn(
                      'border-b pb-1 transition-colors',
                      heatRange === y
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground/60 hover:text-foreground',
                    )}
                  >
                    {y}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Per-platform streaks as a quiet text line */}
          <div className="mb-6 flex flex-wrap gap-x-8 gap-y-2">
            {heatCards
              .filter((c) => c.heatmap.currentStreak > 0 || c.heatmap.longestStreak > 0)
              .map((c) => (
                <span key={`${c.platform}-${c.username}`} className="inline-flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                  <PlatformIcon platform={c.platform} className="size-3" />
                  {multiPlatforms.has(c.platform) && (
                    <span className="text-[9px] opacity-70">{c.username}</span>
                  )}
                  {c.heatmap.currentStreak > 0 && (
                    <>
                      <Flame className="size-3 text-primary" />
                      <span className="text-foreground">{c.heatmap.currentStreak}d</span>
                    </>
                  )}
                  <span className="text-muted-foreground/50">best {c.heatmap.longestStreak}d</span>
                </span>
              ))}
          </div>

          <div ref={heatmapRef} className="relative">
            <div className="-mx-2 overflow-x-auto px-2 pb-2">
              {isLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : (
                <ActivityCalendar
                  data={unifiedHeatmap}
                  theme={{ dark: ['#101015', '#252750', '#3f43a8', '#5b60e0', '#7c83ff'] }}
                  colorScheme="dark"
                  blockSize={12}
                  blockMargin={4}
                  blockRadius={3}
                  fontSize={11}
                  labels={{ totalCount: heatCountLabel }}
                  renderBlock={(block, activity) =>
                    cloneElement(block, {
                      onMouseEnter: (e: React.MouseEvent) => {
                        const rect = heatmapRef.current?.getBoundingClientRect()
                        if (!rect) return
                        setHoveredDay({ activity, x: e.clientX - rect.left, y: e.clientY - rect.top })
                      },
                      onMouseMove: (e: React.MouseEvent) => {
                        const rect = heatmapRef.current?.getBoundingClientRect()
                        if (!rect) return
                        setHoveredDay({ activity, x: e.clientX - rect.left, y: e.clientY - rect.top })
                      },
                      onMouseLeave: () => setHoveredDay(null),
                      style: { cursor: 'pointer' },
                    })
                  }
                />
              )}
            </div>

            {/* Custom instant tooltip — date + per-platform breakdown */}
            {hoveredDay && (() => {
              const { activity, x, y } = hoveredDay
              const dateLabel = new Date(`${activity.date}T00:00:00`).toLocaleDateString(undefined, {
                weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
              })
              const parts = breakdownByDate.get(activity.date) ?? []
              return (
                <div
                  className="pointer-events-none absolute z-50 -translate-x-1/2 -translate-y-full"
                  style={{ left: x, top: y - 10 }}
                >
                  <div className="relative min-w-[170px] rounded-xl border border-primary/20 bg-popover/95 px-3 py-2.5 shadow-2xl shadow-black/50 backdrop-blur-md">
                    <p className="text-[11px] font-medium tracking-wide text-foreground">{dateLabel}</p>
                    <p className="mb-2 flex items-baseline gap-1 font-mono text-[13px] font-bold text-primary">
                      {activity.count}
                      <span className="text-[10px] font-normal text-muted-foreground">
                        contribution{activity.count === 1 ? '' : 's'}
                      </span>
                    </p>
                    {parts.length ? (
                      <div className="space-y-1">
                        {parts.map((p) => (
                          <div key={`${p.platform}-${p.username}`} className="flex items-center justify-between gap-4 text-[11px]">
                            <span className="flex items-center gap-1.5" style={{ color: PLATFORM_COLORS[p.platform] }}>
                              <PlatformIcon platform={p.platform as Platform} className="size-3" />
                              {PLATFORM_LABELS[p.platform] ?? p.platform}
                              {multiPlatforms.has(p.platform) && (
                                <span className="font-mono text-[9px] opacity-70">{p.username}</span>
                              )}
                            </span>
                            <span className="font-mono tabular-nums text-muted-foreground">{p.count}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted-foreground/60">No activity</p>
                    )}
                    {/* arrow */}
                    <span className="absolute left-1/2 top-full size-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[2px] border-b border-r border-primary/20 bg-popover/95" />
                  </div>
                </div>
              )
            })()}
          </div>
        </section>

        {/* ── Colophon + common footer ──────────────────────── */}
        <div className="mt-16 border-t border-border/50 pt-6">
          <p className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground/40">
            <span className="text-[var(--term-green)]">$</span> compiled --source {BRAND_SLUG} --from {loaded.length} platform{loaded.length !== 1 ? 's' : ''}
            <span className="caret" />
          </p>
          {!hideFooter ? <AppFooter className="mt-8 pb-4" /> : null}
        </div>

      </div>

      {/* Terminal boot loader — reports source-fetch progress, self-dismisses */}
      <ProfileLoader cards={cards} />

      {/* Floating share. A saved /userid page is already the short URL, so it
          shares directly; the params view offers long URL vs short URL. */}
      {!hideShare && !isPlacement ? (
        owner ? (
        <ShareFab
          onClick={() => void handleShareLong()}
          label="Share profile"
          toast={shareToast}
          onToastDone={() => setShareToast(null)}
        />
      ) : (
        <ShareFab
          label="Share profile"
          busy={isSavingShort}
          toast={shareToast}
          onToastDone={() => setShareToast(null)}
          actions={[
            {
              key: 'params',
              label: 'share url with these params',
              icon: Link2,
              onClick: () => void handleShareLong(),
            },
            user
              ? {
                  key: 'short',
                  label: 'save & copy short url',
                  icon: UserCircle2,
                  onClick: () => void handleShortUrl(),
                }
              : {
                  key: 'login',
                  label: 'login for short url',
                  icon: LogIn,
                  onClick: () => navigate({
                    to: '/login',
                    search: { next: `${window.location.pathname}${window.location.search}` },
                  }),
                },
          ]}
        />
      )
      ) : null}
    </div>
    </>
  )
}
