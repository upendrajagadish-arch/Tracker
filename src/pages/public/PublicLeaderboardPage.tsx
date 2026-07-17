import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
import { FAME_LEVELS, fameLevelFromXp, fameLevelProgress } from '@/lib/leaderboardFame'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 50
const LIVE_REFRESH_MS = 20_000

const PODIUM_STYLES = [
  {
    ring: 'ring-[#F0B90B]',
    glow: 'shadow-[0_0_45px_-8px_rgba(240,185,11,0.55)]',
    text: 'text-[#F0B90B]',
    label: 'Champion',
    emoji: '🥇',
    height: 'md:min-h-[280px]',
  },
  {
    ring: 'ring-[#C0C7D1]',
    glow: 'shadow-[0_0_40px_-10px_rgba(192,199,209,0.5)]',
    text: 'text-[#C0C7D1]',
    label: 'Challenger',
    emoji: '🥈',
    height: 'md:min-h-[250px]',
  },
  {
    ring: 'ring-[#CD7F32]',
    glow: 'shadow-[0_0_40px_-10px_rgba(205,127,50,0.5)]',
    text: 'text-[#CD7F32]',
    label: 'Rising Star',
    emoji: '🥉',
    height: 'md:min-h-[230px]',
  },
] as const

function rankBadgeClasses(rank: number): string {
  if (rank === 1) return 'bg-[#F0B90B]/15 text-[#F0B90B] border-[#F0B90B]/40'
  if (rank === 2) return 'bg-[#C0C7D1]/15 text-[#C0C7D1] border-[#C0C7D1]/40'
  if (rank === 3) return 'bg-[#CD7F32]/15 text-[#CD7F32] border-[#CD7F32]/40'
  return 'bg-elevated text-secondary border-soft'
}

function profileHref(row: LeaderboardRow): string | null {
  return row.shareToken ? publicStudentPerformanceUrl(row.shareToken) : null
}

function XpBar({ xp, className }: { xp: number; className?: string }) {
  const level = fameLevelFromXp(xp)
  const progress = fameLevelProgress(xp)
  return (
    <div className={cn('w-full', className)}>
      <div className="mb-1 flex items-center justify-between gap-2 text-[10px]">
        <span className="font-semibold uppercase tracking-wide" style={{ color: level.color }}>
          {level.name}
        </span>
        <span className="tnum text-secondary">
          {xp} XP
          {progress.next != null ? ` · next ${progress.next}` : ' · MAX'}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[#0B0E11]/80 ring-1 ring-[#2B3139]">
        <motion.div
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${level.color}99, ${level.color})` }}
          initial={{ width: 0 }}
          animate={{ width: `${progress.percent}%` }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[#2B3139]/80 bg-[#0B0E11]/50 px-2 py-1 text-center">
      <p className="text-[9px] uppercase tracking-wide text-secondary">{label}</p>
      <p className="tnum text-[12px] font-semibold text-foreground">{value}</p>
    </div>
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

function PodiumCard({ row, place }: { row: LeaderboardRow; place: 0 | 1 | 2 }) {
  const style = PODIUM_STYLES[place]
  const level = fameLevelFromXp(row.fameXp)
  return (
    <StudentLink
      row={row}
      className={cn(
        'group relative flex flex-col items-center overflow-hidden rounded-card border border-soft bg-gradient-to-b from-card via-card to-[#D27918]/[0.08] px-5 pb-5 text-center transition-transform duration-300 hover:-translate-y-1.5',
        style.glow,
        style.height,
        place === 0 ? 'pt-8 md:-mt-6' : 'pt-6',
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#D27918]/60 to-transparent"
      />
      <span className="text-[28px]">{style.emoji}</span>
      <img
        src={leaderboardAvatarUrl(row.rollNumber)}
        alt=""
        loading="lazy"
        className={cn(
          'mt-3 size-20 rounded-full bg-elevated ring-2 transition-transform duration-300 group-hover:scale-110',
          style.ring,
        )}
      />
      <p className={cn('mt-3 text-[11px] font-semibold uppercase tracking-[0.18em]', style.text)}>
        {style.label}
      </p>
      <p className="mt-1 truncate font-heading text-[17px] font-bold text-foreground">
        {row.fullName}
      </p>
      <p className="tnum mt-0.5 text-[12px] text-secondary group-hover:text-binance group-hover:underline">
        {row.rollNumber}
      </p>
      <p
        className="mt-2 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
        style={{ color: level.color, background: `${level.color}22`, border: `1px solid ${level.color}55` }}
      >
        {row.fameLevel || level.name}
      </p>
      <p className={cn('tnum mt-2 text-[28px] font-bold tracking-tight', style.text)}>
        {row.fameXp}
        <span className="ml-1 text-[12px] font-semibold text-secondary">XP</span>
      </p>
      <XpBar xp={row.fameXp} className="mt-3 w-full max-w-[200px]" />
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

  // Auto-refresh so ranks rearrange when evaluation scores change.
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
            'Hall of Fame needs a database update. Run scripts/apply-gamified-leaderboard.sql in the Supabase SQL Editor.',
          )
        } else if (!quiet) {
          setError(message)
        }
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [search],
  )

  useEffect(() => {
    void load(0, false, liveTick > 0)
  }, [load, liveTick])

  const handleSearch = (event: FormEvent) => {
    event.preventDefault()
    setSearch(searchDraft.trim())
  }

  const podium = useMemo(
    () => (search ? [] : rows.filter((r) => r.rank <= 3).slice(0, 3)),
    [rows, search],
  )
  const podiumRolls = useMemo(() => new Set(podium.map((r) => r.rollNumber)), [podium])
  const listRows = useMemo(
    () => rows.filter((r) => !podiumRolls.has(r.rollNumber)),
    [rows, podiumRolls],
  )

  return (
    <>
      <SeoHead
        title="Hall of Fame · Student Performance"
        description="Gamified leaderboard that re-ranks live when evaluation scores improve."
      />
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
        <div className="relative overflow-hidden rounded-card border border-soft bg-gradient-to-b from-card via-card to-[#D27918]/[0.12] px-6 py-10 text-center shadow-[0_0_60px_-20px_rgba(210,121,24,0.5)]">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#D27918]/70 to-transparent"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 left-1/2 size-72 -translate-x-1/2 rounded-full bg-[#D27918]/14 blur-3xl"
          />
          <p className="text-[12px] font-semibold uppercase tracking-[0.3em] text-binance">
            Live · Gamified
          </p>
          <h1 className="mt-2 font-heading text-[34px] font-bold tracking-tight text-foreground">
            🏆 Hall of Fame
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-[14px] leading-relaxed text-secondary">
            Climb the ranks with Fame XP earned from Communication, Aptitude, Verbal, CodeNow,
            readiness, and coding solved. Scores update and the board rearranges automatically.
          </p>

          <div className="mx-auto mt-5 flex max-w-2xl flex-wrap items-center justify-center gap-2">
            {FAME_LEVELS.map((level) => (
              <span
                key={level.name}
                className="rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide"
                style={{
                  color: level.color,
                  borderColor: `${level.color}66`,
                  background: `${level.color}18`,
                }}
              >
                {level.name}
              </span>
            ))}
          </div>

          <form
            onSubmit={handleSearch}
            className="mx-auto mt-6 flex max-w-md items-center gap-2"
          >
            <input
              className="h-10 w-full rounded-full border border-soft bg-[#0B0E11]/70 px-5 text-sm text-foreground placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D27918]/50"
              placeholder="Find your rank — roll number or name…"
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
            />
            <Button type="submit" size="sm" className="h-10 rounded-full px-5">
              Search
            </Button>
            {search ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-10 rounded-full px-4"
                onClick={() => {
                  setSearchDraft('')
                  setSearch('')
                }}
              >
                Clear
              </Button>
            ) : null}
          </form>

          <p className="mt-3 text-[11px] text-secondary">
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
            <PlacementLoadingBlock label="Loading Hall of Fame…" />
          </div>
        ) : rows.length === 0 ? (
          <Card className="mt-6 border-soft bg-card">
            <CardContent className="py-14 text-center">
              <h3 className="font-heading text-[18px] font-bold text-foreground">
                No champions yet
              </h3>
              <p className="mt-1.5 text-sm text-secondary">
                {search
                  ? `Nothing matched “${search}”. Try a different roll number or name.`
                  : 'Complete evaluations to start earning Fame XP and appear on the board.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {podium.length === 3 ? (
              <div className="mt-8 grid gap-4 md:grid-cols-3 md:items-end">
                <motion.div
                  className="md:order-1"
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                >
                  <PodiumCard row={podium[1]!} place={1} />
                </motion.div>
                <motion.div
                  className="md:order-2"
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <PodiumCard row={podium[0]!} place={0} />
                </motion.div>
                <motion.div
                  className="md:order-3"
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <PodiumCard row={podium[2]!} place={2} />
                </motion.div>
              </div>
            ) : null}

            <Card className="mt-6 overflow-hidden border-soft bg-card">
              <CardContent className="p-0">
                <div className="flex items-center justify-between border-b border-soft px-5 py-3.5">
                  <div>
                    <h2 className="font-heading text-[15px] font-semibold text-foreground">
                      {search ? `Results for “${search}”` : 'Live Rankings'}
                    </h2>
                    <p className="text-[11px] text-secondary">
                      Reorders instantly when any evaluation score improves
                    </p>
                  </div>
                  <p className="tnum text-[12px] text-secondary">{total} players</p>
                </div>
                <ul className="divide-y divide-[#2B3139]/70">
                  <AnimatePresence initial={false}>
                    {listRows.map((row) => {
                      const level = fameLevelFromXp(row.fameXp)
                      return (
                        <motion.li
                          key={row.rollNumber}
                          layout
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                        >
                          <StudentLink
                            row={row}
                            className="group flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-[#D27918]/[0.06] sm:gap-4 sm:px-5"
                          >
                            <span
                              className={cn(
                                'tnum flex size-9 shrink-0 items-center justify-center rounded-full border text-[13px] font-bold',
                                rankBadgeClasses(row.rank),
                              )}
                            >
                              {row.rank}
                            </span>
                            <img
                              src={leaderboardAvatarUrl(row.rollNumber)}
                              alt=""
                              loading="lazy"
                              className="size-11 shrink-0 rounded-full bg-elevated ring-1 ring-[#2B3139] transition-transform duration-200 group-hover:scale-110 group-hover:ring-[#D27918]/60"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="truncate text-[14px] font-semibold text-foreground">
                                  {row.fullName}
                                </p>
                                <span
                                  className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide"
                                  style={{
                                    color: level.color,
                                    background: `${level.color}22`,
                                    border: `1px solid ${level.color}55`,
                                  }}
                                >
                                  {row.fameLevel || level.name}
                                </span>
                              </div>
                              <p className="tnum truncate text-[12px] text-secondary group-hover:text-binance group-hover:underline">
                                {row.rollNumber}
                                <span className="text-muted"> · {row.branch}</span>
                                {row.academicBatch || row.batch ? (
                                  <span className="text-muted">
                                    {' '}
                                    · {row.academicBatch || row.batch}
                                  </span>
                                ) : null}
                              </p>
                              <XpBar xp={row.fameXp} className="mt-2 max-w-xs" />
                            </div>
                            <div className="hidden shrink-0 grid-cols-2 gap-1.5 lg:grid">
                              <StatChip
                                label="Comm"
                                value={
                                  row.communicationScore != null
                                    ? `${row.communicationScore}%`
                                    : '—'
                                }
                              />
                              <StatChip
                                label="Apt"
                                value={
                                  row.aptitudeScore != null ? `${row.aptitudeScore}%` : '—'
                                }
                              />
                              <StatChip
                                label="Verbal"
                                value={row.verbalScore != null ? `${row.verbalScore}%` : '—'}
                              />
                              <StatChip label="Solved" value={String(row.totalSolved)} />
                            </div>
                            <div className="shrink-0 text-right">
                              <p className="tnum text-[12px] text-secondary">Fame XP</p>
                              <p className="tnum text-[18px] font-bold text-binance">
                                {row.fameXp}
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
              <div className="mt-5 flex justify-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
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
    </>
  )
}
