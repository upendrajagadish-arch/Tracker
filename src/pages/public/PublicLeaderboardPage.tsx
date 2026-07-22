import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Flame, Search, Sparkles, Zap } from 'lucide-react'
import { SeoHead } from '@/components/SeoHead'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PlacementLoadingBlock } from '@/components/placement/PlacementStates'
import {
  getPublicLeaderboard,
  leaderboardAvatarUrl,
  type LeaderboardRow,
} from '@/api/placement/leaderboard'
import { publicStudentPerformanceUrl } from '@/api/placement/studentShare'
import { TRAINING_YEARS, type TrainingYear } from '@/lib/trainingPrograms'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 50
const LIVE_REFRESH_MS = 20_000

const PODIUM_STYLES = [
  {
    ring: 'ring-[#F0B90B]',
    glow: 'shadow-[0_0_55px_-6px_rgba(240,185,11,0.65)]',
    text: 'text-[#F0B90B]',
    pedestal: 'from-[#F0B90B]/35 via-[#F0B90B]/10 to-transparent',
    label: 'Champion',
    crown: '👑',
    height: 'md:min-h-[320px]',
    avatar: 'size-28',
  },
  {
    ring: 'ring-[#C0C7D1]',
    glow: 'shadow-[0_0_45px_-8px_rgba(192,199,209,0.55)]',
    text: 'text-[#C0C7D1]',
    pedestal: 'from-[#C0C7D1]/30 via-[#C0C7D1]/8 to-transparent',
    label: 'Runner-up',
    crown: '🥈',
    height: 'md:min-h-[280px]',
    avatar: 'size-24',
  },
  {
    ring: 'ring-[#CD7F32]',
    glow: 'shadow-[0_0_45px_-8px_rgba(205,127,50,0.55)]',
    text: 'text-[#CD7F32]',
    pedestal: 'from-[#CD7F32]/30 via-[#CD7F32]/8 to-transparent',
    label: 'Rising Star',
    crown: '🥉',
    height: 'md:min-h-[260px]',
    avatar: 'size-22',
  },
] as const

function rankBadgeClasses(rank: number): string {
  if (rank === 1) return 'bg-[#F0B90B]/20 text-[#F0B90B] border-[#F0B90B]/50'
  if (rank === 2) return 'bg-[#C0C7D1]/20 text-[#C0C7D1] border-[#C0C7D1]/50'
  if (rank === 3) return 'bg-[#CD7F32]/20 text-[#CD7F32] border-[#CD7F32]/50'
  return 'bg-[#0B0E11] text-secondary border-[#2B3139]'
}

function profileHref(row: LeaderboardRow): string | null {
  return row.shareToken ? publicStudentPerformanceUrl(row.shareToken) : null
}

function streakLabel(xp: number): string | null {
  if (xp >= 850) return 'On fire'
  if (xp >= 700) return 'Hot streak'
  if (xp >= 550) return 'Climbing'
  return null
}

function ScoreBar({ score, className }: { score: number; className?: string }) {
  const clamped = Math.max(0, Math.min(100, score))
  return (
    <div className={cn('w-full', className)}>
      <div className="mb-1 flex items-center justify-between gap-2 text-[10px]">
        <span className="font-semibold uppercase tracking-wide text-[#D27918]">Avg score</span>
        <span className="tnum text-secondary">{clamped}/100</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-[#0B0E11]/90 ring-1 ring-[#2B3139]">
        <motion.div
          className="relative h-full rounded-full"
          style={{ background: 'linear-gradient(90deg, #D2791888, #D27918)' }}
          initial={{ width: 0 }}
          animate={{ width: `${clamped}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          <span className="absolute inset-y-0 right-0 w-4 animate-pulse bg-white/30 blur-[2px]" />
        </motion.div>
      </div>
    </div>
  )
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#2B3139]/90 bg-[#0B0E11]/70 px-2 py-1 text-center">
      <p className="text-[9px] uppercase tracking-wide text-secondary">{label}</p>
      <p className="tnum text-[12px] font-semibold text-foreground">{value}</p>
    </div>
  )
}

function scoreChips(row: LeaderboardRow) {
  return (
    <>
      <StatChip
        label="Comm"
        value={row.communicationScore != null ? `${row.communicationScore}%` : '—'}
      />
      <StatChip label="Tech Stack" value={`${row.readinessScore}%`} />
      <StatChip label="Solved" value={String(row.totalSolved)} />
      <StatChip label="Avg" value={`${row.avgScore}`} />
    </>
  )
}

function StudentLink({
  row,
  className,
  children,
}: {
  row: LeaderboardRow
  className?: string
  children: React.ReactNode
}) {
  const href = profileHref(row)
  if (!href) return <span className={className}>{children}</span>
  return (
    <a href={href} target="_blank" rel="noreferrer" className={className}>
      {children}
    </a>
  )
}

function PodiumCard({
  row,
  place,
  displayRank,
}: {
  row: LeaderboardRow
  place: 0 | 1 | 2
  displayRank: number
}) {
  const style = PODIUM_STYLES[place]
  const streak = streakLabel(row.avgScore)
  return (
    <StudentLink
      row={row}
      className={cn(
        'group relative flex flex-col items-center overflow-hidden rounded-2xl border border-[#2B3139] bg-[#12161c]/95 px-5 pb-6 text-center backdrop-blur-sm transition-transform duration-300 hover:-translate-y-2',
        style.glow,
        style.height,
        place === 0 ? 'pt-10 md:-mt-8' : 'pt-7',
      )}
    >
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t',
          style.pedestal,
        )}
      />
      <motion.span
        className="text-[34px] drop-shadow-lg"
        animate={{ y: [0, -4, 0], rotate: [0, -6, 6, 0] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      >
        {style.crown}
      </motion.span>
      <div className="relative mt-2">
        <motion.div
          aria-hidden
          className={cn('absolute -inset-2 rounded-full opacity-40 blur-md', style.ring.replace('ring-', 'bg-'))}
          animate={{ scale: [1, 1.08, 1], opacity: [0.35, 0.55, 0.35] }}
          transition={{ duration: 2.2, repeat: Infinity }}
        />
        <img
          src={leaderboardAvatarUrl(row.rollNumber)}
          alt=""
          loading="lazy"
          className={cn(
            'relative rounded-full bg-[#0B0E11] ring-[3px] transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3',
            style.ring,
            place === 0 ? 'size-28' : place === 1 ? 'size-24' : 'size-[5.5rem]',
          )}
        />
        <span
          className={cn(
            'absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider',
            style.text,
            'bg-[#0B0E11]/90 ring-1 ring-current',
          )}
        >
          #{displayRank}
        </span>
      </div>
      <p className={cn('mt-4 text-[11px] font-bold uppercase tracking-[0.2em]', style.text)}>
        {style.label}
      </p>
      <p className="mt-1 max-w-[14rem] truncate font-heading text-[18px] font-bold text-foreground">
        {row.fullName}
      </p>
      <p className="tnum mt-0.5 text-[12px] text-secondary group-hover:text-[#D27918] group-hover:underline">
        {row.rollNumber}
      </p>
      {streak ? (
        <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#D27918]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#D27918]">
          <Flame className="size-3" />
          {streak}
        </span>
      ) : null}
      <p className={cn('tnum mt-2 text-[32px] font-black tracking-tight', style.text)}>
        {row.avgScore}
        <span className="ml-1 text-[12px] font-semibold text-secondary">Avg</span>
      </p>
      <ScoreBar score={row.avgScore} className="mt-3 w-full max-w-[220px]" />
      <div className="mt-3 grid w-full max-w-[240px] grid-cols-2 gap-1.5">{scoreChips(row)}</div>
      <p className="mt-3 text-[12px] text-secondary">
        {row.branch}
        {row.academicBatch || row.batch ? ` · ${row.academicBatch || row.batch}` : ''}
      </p>
    </StudentLink>
  )
}

export function PublicLeaderboardPage() {
  const [rows, setRows] = useState<LeaderboardRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchDraft, setSearchDraft] = useState('')
  const [search, setSearch] = useState('')
  const [year, setYear] = useState<TrainingYear>(TRAINING_YEARS[0]!)
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)
  const [liveTick, setLiveTick] = useState(0)

  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex,nofollow'
    document.head.appendChild(meta)
    return () => {
      document.head.removeChild(meta)
    }
  }, [])

  useEffect(() => {
    const id = window.setInterval(() => setLiveTick((t) => t + 1), LIVE_REFRESH_MS)
    const onFocus = () => setLiveTick((t) => t + 1)
    window.addEventListener('focus', onFocus)
    return () => {
      window.clearInterval(id)
      window.removeEventListener('focus', onFocus)
    }
  }, [])

  const load = useCallback(
    async (offset: number, append: boolean, quiet = false) => {
      if (append) setLoadingMore(true)
      else if (!quiet) setLoading(true)
      setError(null)
      try {
        const result = await getPublicLeaderboard({
          search: search || undefined,
          year,
          limit: PAGE_SIZE,
          offset,
        })
        setTotal(result.total)
        setGeneratedAt(result.generatedAt)
        setRows((prev) => (append ? [...prev, ...result.rows] : result.rows))
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Failed to load leaderboard'
        if (/get_public_leaderboard|schema cache|function/i.test(message)) {
          setError(
            'Leaderboard needs a database update. Run scripts/apply-year-wise-leaderboard.sql in the Supabase SQL Editor.',
          )
        } else if (!quiet) {
          setError(message)
        }
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [search, year],
  )

  useEffect(() => {
    void load(0, false, liveTick > 0)
  }, [load, liveTick])

  const handleSearch = (event: FormEvent) => {
    event.preventDefault()
    setSearch(searchDraft.trim())
  }

  const rankedRows = useMemo<Array<LeaderboardRow & { displayRank: number }>>(() => {
    const sorted = [...rows].sort((a, b) => {
      const avgDiff = (b.avgScore ?? 0) - (a.avgScore ?? 0)
      if (avgDiff !== 0) return avgDiff
      const fameDiff = (b.fameXp ?? 0) - (a.fameXp ?? 0)
      if (fameDiff !== 0) return fameDiff
      return a.rollNumber.localeCompare(b.rollNumber, undefined, { numeric: true })
    })
    return sorted.map((row, index) => ({ ...row, displayRank: index + 1 }))
  }, [rows])

  const podium = useMemo(() => (search ? [] : rankedRows.filter((r) => r.displayRank <= 3).slice(0, 3)), [rankedRows, search])
  const podiumRolls = useMemo(() => new Set(podium.map((r) => r.rollNumber)), [podium])
  const listRows = useMemo(() => rankedRows.filter((r) => !podiumRolls.has(r.rollNumber)), [rankedRows, podiumRolls])

  return (
    <>
      <SeoHead
        title="Leaderboard · Student Performance"
        description="Live leaderboard ranked by average of Communication, Tech Stack, and coding problems solved."
      />
      <div className="relative min-h-screen overflow-hidden bg-[#0B0E11]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 10%, rgba(210,121,24,0.22), transparent 35%), radial-gradient(circle at 80% 0%, rgba(240,185,11,0.12), transparent 30%), radial-gradient(circle at 50% 100%, rgba(14,203,129,0.08), transparent 40%)',
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        <div className="relative mx-auto w-full max-w-5xl flex-1 px-4 py-10">
          <div className="relative overflow-hidden rounded-3xl border border-[#2B3139] bg-gradient-to-b from-[#161b22] via-[#12161c] to-[#1a120c] px-6 py-11 text-center shadow-[0_0_80px_-24px_rgba(210,121,24,0.55)]">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#D27918] to-transparent"
            />
            <motion.div
              aria-hidden
              className="pointer-events-none absolute -top-20 left-1/2 size-80 -translate-x-1/2 rounded-full bg-[#D27918]/20 blur-3xl"
              animate={{ opacity: [0.35, 0.55, 0.35], scale: [1, 1.08, 1] }}
              transition={{ duration: 4, repeat: Infinity }}
            />

            <div className="relative inline-flex items-center gap-2 rounded-full border border-[#D27918]/40 bg-[#D27918]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-[#D27918]">
              <Zap className="size-3.5" />
              Live arena · Avg score ranks
              <Sparkles className="size-3.5" />
            </div>
            <h1 className="relative mt-4 font-heading text-[40px] font-black tracking-tight text-foreground sm:text-[46px]">
              Leaderboard
            </h1>
            <p className="relative mx-auto mt-2 max-w-xl text-[14px] leading-relaxed text-secondary">
              Year-wise ranks by Communication, Tech Stack, and coding problems solved.
              Students with score 0 still appear on their pass-out year board.
            </p>

            <div className="relative mx-auto mt-5 flex max-w-xl flex-wrap items-center justify-center gap-2">
              {TRAINING_YEARS.map((tabYear) => (
                <button
                  key={tabYear}
                  type="button"
                  onClick={() => {
                    setYear(tabYear)
                    setSearchDraft('')
                    setSearch('')
                  }}
                  className={cn(
                    'rounded-full border px-4 py-2 text-[12px] font-bold uppercase tracking-wide transition',
                    year === tabYear
                      ? 'border-[#D27918] bg-[#D27918] text-black'
                      : 'border-[#2B3139] bg-[#0B0E11]/70 text-secondary hover:border-[#D27918]/50 hover:text-[#D27918]',
                  )}
                >
                  {tabYear}
                </button>
              ))}
            </div>

            <div className="relative mx-auto mt-4 flex max-w-2xl flex-wrap items-center justify-center gap-2">
              {[
                { label: 'Communication', color: '#3B82F6' },
                { label: 'Tech Stack', color: '#D27918' },
                { label: 'Problems Solved', color: '#0ECB81' },
                { label: 'Avg Score', color: '#F0B90B' },
              ].map((item) => (
                <span
                  key={item.label}
                  className="rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide"
                  style={{
                    color: item.color,
                    borderColor: `${item.color}66`,
                    background: `${item.color}18`,
                  }}
                >
                  {item.label}
                </span>
              ))}
            </div>

            <form
              onSubmit={handleSearch}
              className="relative mx-auto mt-7 flex max-w-md items-center gap-2"
            >
              <div className="relative w-full">
                <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-secondary" />
                <input
                  className="h-11 w-full rounded-full border border-[#2B3139] bg-[#0B0E11]/80 pl-11 pr-5 text-sm text-foreground placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D27918]/50"
                  placeholder="Find your rank — roll number or name…"
                  value={searchDraft}
                  onChange={(e) => setSearchDraft(e.target.value)}
                />
              </div>
              <Button type="submit" size="sm" className="h-11 rounded-full px-5">
                Search
              </Button>
              {search ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-11 rounded-full px-4"
                  onClick={() => {
                    setSearchDraft('')
                    setSearch('')
                  }}
                >
                  Clear
                </Button>
              ) : null}
            </form>

            <p className="relative mt-3 text-[11px] text-secondary">
              Auto-refreshes every {LIVE_REFRESH_MS / 1000}s
              {generatedAt
                ? ` · last sync ${new Date(generatedAt).toLocaleTimeString()}`
                : ''}
            </p>
          </div>

          {error ? (
            <Card className="mt-6 border-[#F6465D]/35 bg-[#F6465D]/10">
              <CardContent className="py-5 text-center text-sm font-semibold text-[#F6465D]">
                {error}
              </CardContent>
            </Card>
          ) : null}

          {loading ? (
            <div className="py-16">
              <PlacementLoadingBlock label="Loading Leaderboard…" />
            </div>
          ) : rows.length === 0 ? (
            <Card className="mt-6 border-[#2B3139] bg-[#12161c]">
              <CardContent className="py-14 text-center">
                <h3 className="font-heading text-[18px] font-bold text-foreground">
                  Arena is empty
                </h3>
                <p className="mt-1.5 text-sm text-secondary">
                  {search
                    ? `Nothing matched “${search}”. Try a different roll number or name.`
                    : `No students in the ${year} pass-out year yet. They will appear here after registering with year ${year}, including score 0.`}
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {podium.length === 3 ? (
                <div className="mt-10 grid gap-4 md:grid-cols-3 md:items-end">
                  <motion.div
                    className="md:order-1"
                    layout
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                  >
                    <PodiumCard row={podium[1]!} place={1} displayRank={podium[1]!.displayRank} />
                  </motion.div>
                  <motion.div
                    className="md:order-2"
                    layout
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <PodiumCard row={podium[0]!} place={0} displayRank={podium[0]!.displayRank} />
                  </motion.div>
                  <motion.div
                    className="md:order-3"
                    layout
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <PodiumCard row={podium[2]!} place={2} displayRank={podium[2]!.displayRank} />
                  </motion.div>
                </div>
              ) : null}

              <Card className="mt-8 overflow-hidden border-[#2B3139] bg-[#12161c]/95 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.8)]">
                <CardContent className="p-0">
                  <div className="flex items-center justify-between border-b border-[#2B3139] bg-gradient-to-r from-[#D27918]/10 via-transparent to-transparent px-5 py-4">
                    <div>
                      <h2 className="font-heading text-[16px] font-bold text-foreground">
                        {search ? `Results for “${search}”` : `${year} Live Rankings`}
                      </h2>
                      <p className="text-[11px] text-secondary">
                        Pass-out year {year} · includes score 0 · Comm · Tech · Solved · Avg
                      </p>
                    </div>
                    <p className="tnum rounded-full border border-[#D27918]/35 bg-[#D27918]/10 px-3 py-1 text-[12px] font-semibold text-[#D27918]">
                      {total} students
                    </p>
                  </div>
                  <ul className="divide-y divide-[#2B3139]/80">
                    <AnimatePresence initial={false}>
                      {listRows.map((row, index) => {
                        const streak = streakLabel(row.avgScore)
                        return (
                          <motion.li
                            key={row.rollNumber}
                            layout
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                          >
                            <StudentLink
                              row={row}
                              className={cn(
                                'group flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-[#D27918]/[0.07] sm:gap-4 sm:px-5',
                                index % 2 === 0 ? 'bg-transparent' : 'bg-[#0B0E11]/35',
                              )}
                            >
                              <span
                                className={cn(
                                  'tnum flex size-10 shrink-0 items-center justify-center rounded-xl border text-[13px] font-black',
                                  rankBadgeClasses(row.displayRank),
                                )}
                              >
                                {row.displayRank}
                              </span>
                              <div className="relative shrink-0">
                                <img
                                  src={leaderboardAvatarUrl(row.rollNumber)}
                                  alt=""
                                  loading="lazy"
                                  className="size-12 rounded-2xl bg-[#0B0E11] ring-2 ring-[#2B3139] transition-transform duration-200 group-hover:scale-110 group-hover:rotate-3 group-hover:ring-[#D27918]/70"
                                />
                                {row.displayRank <= 10 ? (
                                  <span className="absolute -right-1 -top-1 rounded-full bg-[#D27918] px-1 text-[9px] font-black text-black">
                                    TOP
                                  </span>
                                ) : null}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="truncate text-[14px] font-bold text-foreground">
                                    {row.fullName}
                                  </p>
                                  {streak ? (
                                    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-[#D27918]">
                                      <Flame className="size-3" />
                                      {streak}
                                    </span>
                                  ) : null}
                                </div>
                                <p className="tnum truncate text-[12px] text-secondary group-hover:text-[#D27918] group-hover:underline">
                                  {row.rollNumber}
                                  <span className="text-muted"> · {row.branch}</span>
                                  {row.academicBatch || row.batch ? (
                                    <span className="text-muted">
                                      {' '}
                                      · {row.academicBatch || row.batch}
                                    </span>
                                  ) : null}
                                </p>
                                <ScoreBar score={row.avgScore} className="mt-2 max-w-xs" />
                              </div>
                              <div className="hidden shrink-0 grid-cols-2 gap-1.5 lg:grid">
                                {scoreChips(row)}
                              </div>
                              <div className="shrink-0 text-right">
                                <p className="tnum text-[11px] uppercase tracking-wide text-secondary">
                                  Avg
                                </p>
                                <p className="tnum text-[20px] font-black text-[#D27918]">
                                  {row.avgScore}
                                </p>
                              </div>
                            </StudentLink>
                          </motion.li>
                        )
                      })}
                    </AnimatePresence>
                  </ul>
                </CardContent>
              </Card>

              {rows.length < total ? (
                <div className="mt-6 flex justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-full border-[#D27918]/40 px-6 text-[#D27918] hover:bg-[#D27918]/10"
                    disabled={loadingMore}
                    onClick={() => void load(rows.length, true)}
                  >
                    {loadingMore ? 'Loading…' : `Load more (${total - rows.length} remaining)`}
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </>
  )
}
