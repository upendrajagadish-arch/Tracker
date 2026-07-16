import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
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
import { cn } from '@/lib/utils'

const PAGE_SIZE = 50

const PODIUM_STYLES = [
  {
    ring: 'ring-[#F0B90B]',
    glow: 'shadow-[0_0_45px_-8px_rgba(240,185,11,0.55)]',
    text: 'text-[#F0B90B]',
    label: 'Champion',
    emoji: '🥇',
  },
  {
    ring: 'ring-[#C0C7D1]',
    glow: 'shadow-[0_0_40px_-10px_rgba(192,199,209,0.5)]',
    text: 'text-[#C0C7D1]',
    label: 'Runner-up',
    emoji: '🥈',
  },
  {
    ring: 'ring-[#CD7F32]',
    glow: 'shadow-[0_0_40px_-10px_rgba(205,127,50,0.5)]',
    text: 'text-[#CD7F32]',
    label: 'Third place',
    emoji: '🥉',
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
  return (
    <StudentLink
      row={row}
      className={cn(
        'group relative flex flex-col items-center overflow-hidden rounded-card border border-soft bg-gradient-to-b from-card via-card to-[#D27918]/[0.08] px-6 pb-6 text-center transition-transform duration-300 hover:-translate-y-1.5',
        style.glow,
        place === 0 ? 'pt-8 md:-mt-4' : 'pt-6',
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
      <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-secondary">
        Readiness
      </p>
      <p className={cn('tnum text-[30px] font-bold tracking-tight', style.text)}>
        {row.readinessScore}
      </p>
      <p className="text-[12px] text-secondary">
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

  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex,nofollow'
    document.head.appendChild(meta)
    return () => {
      document.head.removeChild(meta)
    }
  }, [])

  const load = useCallback(
    async (offset: number, append: boolean) => {
      if (append) setLoadingMore(true)
      else setLoading(true)
      setError(null)
      try {
        const result = await getPublicLeaderboard({
          search: search || undefined,
          limit: PAGE_SIZE,
          offset,
        })
        setTotal(result.total)
        setRows((prev) => (append ? [...prev, ...result.rows] : result.rows))
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Failed to load leaderboard'
        if (/get_public_leaderboard|schema cache|function/i.test(message)) {
          setError(
            'Leaderboard needs a database update. Ask your admin to run scripts/apply-public-leaderboard-migration.sql in the Supabase SQL Editor.',
          )
        } else {
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
    void load(0, false)
  }, [load])

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
        title="Student Performance Leaderboard"
        description="Top performing students ranked by placement readiness."
      />
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
        <div className="relative overflow-hidden rounded-card border border-soft bg-gradient-to-b from-card via-card to-[#D27918]/[0.1] px-6 py-10 text-center shadow-[0_0_60px_-20px_rgba(210,121,24,0.45)]">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#D27918]/70 to-transparent"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 left-1/2 size-72 -translate-x-1/2 rounded-full bg-[#D27918]/12 blur-3xl"
          />
          <p className="text-[12px] font-semibold uppercase tracking-[0.3em] text-binance">
            Hall of Fame
          </p>
          <h1 className="mt-2 font-heading text-[34px] font-bold tracking-tight text-foreground">
            🏆 Performance Leaderboard
          </h1>
          <p className="mx-auto mt-2 max-w-lg text-[14px] leading-relaxed text-secondary">
            Top performers ranked by placement readiness. Search your roll number to find your
            rank — tap any student to open their full shared profile.
          </p>

          <form
            onSubmit={handleSearch}
            className="mx-auto mt-6 flex max-w-md items-center gap-2"
          >
            <input
              className="h-10 w-full rounded-full border border-soft bg-[#0B0E11]/70 px-5 text-sm text-foreground placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D27918]/50"
              placeholder="Search roll number or name…"
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
            <PlacementLoadingBlock label="Loading leaderboard…" />
          </div>
        ) : rows.length === 0 ? (
          <Card className="mt-6 border-soft bg-card">
            <CardContent className="py-14 text-center">
              <h3 className="font-heading text-[18px] font-bold text-foreground">
                No students found
              </h3>
              <p className="mt-1.5 text-sm text-secondary">
                {search
                  ? `Nothing matched “${search}”. Try a different roll number or name.`
                  : 'The leaderboard will appear once student profiles are added.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {podium.length === 3 ? (
              <div className="mt-8 grid gap-4 md:grid-cols-3 md:items-end">
                <div className="md:order-1">
                  <PodiumCard row={podium[1]} place={1} />
                </div>
                <div className="md:order-2">
                  <PodiumCard row={podium[0]} place={0} />
                </div>
                <div className="md:order-3">
                  <PodiumCard row={podium[2]} place={2} />
                </div>
              </div>
            ) : null}

            <Card className="mt-6 overflow-hidden border-soft bg-card">
              <CardContent className="p-0">
                <div className="flex items-center justify-between border-b border-soft px-5 py-3.5">
                  <h2 className="font-heading text-[15px] font-semibold text-foreground">
                    {search ? `Results for “${search}”` : 'Rankings'}
                  </h2>
                  <p className="tnum text-[12px] text-secondary">{total} students</p>
                </div>
                <ul className="divide-y divide-[#2B3139]/70">
                  {listRows.map((row) => (
                    <li key={`${row.rank}-${row.rollNumber}`}>
                      <StudentLink
                        row={row}
                        className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[#D27918]/[0.06] sm:gap-4 sm:px-5"
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
                          className="size-10 shrink-0 rounded-full bg-elevated ring-1 ring-[#2B3139] transition-transform duration-200 group-hover:scale-110 group-hover:ring-[#D27918]/60"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[14px] font-semibold text-foreground">
                            {row.fullName}
                          </p>
                          <p className="tnum truncate text-[12px] text-secondary group-hover:text-binance group-hover:underline">
                            {row.rollNumber}
                            <span className="text-muted"> · {row.branch}</span>
                            {row.academicBatch || row.batch ? (
                              <span className="text-muted"> · {row.academicBatch || row.batch}</span>
                            ) : null}
                          </p>
                        </div>
                        <div className="hidden shrink-0 text-right sm:block">
                          <p className="tnum text-[12px] text-secondary">Solved</p>
                          <p className="tnum text-[14px] font-semibold text-foreground">
                            {row.totalSolved}
                          </p>
                        </div>
                        <div className="hidden shrink-0 text-right md:block">
                          <p className="tnum text-[12px] text-secondary">Communication</p>
                          <p className="tnum text-[14px] font-semibold text-foreground">
                            {row.communicationScore != null ? `${row.communicationScore}%` : '—'}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="tnum text-[12px] text-secondary">Readiness</p>
                          <p className="tnum text-[16px] font-bold text-binance">
                            {row.readinessScore}
                          </p>
                        </div>
                      </StudentLink>
                    </li>
                  ))}
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
