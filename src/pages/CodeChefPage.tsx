import { useState } from 'react'
import { useParams } from '@tanstack/react-router'
import { SeoHead } from '@/components/SeoHead'
import { useCodeChefStats, useCodeChefRating, useCodeChefHeatmap } from '../hooks/usePlatform'
import { UniversalHeatmap } from '../components/UniversalHeatmap'
import { RatingChart } from '../components/RatingChart'
import { ErrorBadge } from '../components/ErrorBadge'
import { ActivityFilterBar } from '../components/ActivityFilterBar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { formatDisplayDate } from '@/lib/utils'
import { Section, SectionGroup } from '../components/Section'
import { PageHero } from '../components/PageHero'
import { AppHeader } from '../components/AppHeader'
import { AppFooter } from '../components/AppFooter'
import { PLATFORM_ACCENT } from '../components/platformMeta'
import { StatBand } from '../components/StatBand'
import { MetricTile } from '../components/MetricTile'
import { DetailSkeleton } from '../components/DetailSkeleton'

const ACCENT = PLATFORM_ACCENT.codechef
const CHEF_GRADIENT = 'linear-gradient(90deg, var(--platform-codechef), #c98b3f)'

const HEATMAP_VIEWS = [
  { value: 'last_365', label: '365D' },
  { value: 'year', label: 'Year' },
] as const

export function CodeChefPage() {
  const { username } = useParams({ from: '/codechef/$username' })
  const [heatmapView, setHeatmapView] = useState<'all' | 'last_365' | 'year'>('last_365')
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())



  const { data: profileData, isLoading: profileLoading, error: profileError } = useCodeChefStats(username)
  const { data: ratingData, isLoading: ratingLoading, error: ratingError } = useCodeChefRating(username)
  const { data: heatmapData, isLoading: heatmapLoading, error: heatmapError } = useCodeChefHeatmap(username, {
    view: heatmapView,
    year: heatmapView === 'year' ? selectedYear : null,
  })

  const availableHeatmapYears = heatmapData?.availableYears ?? []

  function handleHeatmapViewChange(value: 'all' | 'last_365' | 'year') {
    setHeatmapView(value)
    if (value === 'year' && availableHeatmapYears.length > 0 && !availableHeatmapYears.includes(selectedYear)) {
      setSelectedYear(availableHeatmapYears[0])
    }
  }

  const isLoading = profileLoading || ratingLoading || heatmapLoading

  if (isLoading) return (
    <>
      <SeoHead title={`${username} | CodeChef Profile`} url={`https://codetrace.xyz/codechef/${username}`} />
      <div className="mx-auto max-w-5xl px-4 py-8">
        <AppHeader />
        <div className="mt-6"><DetailSkeleton /></div>
      </div>
    </>
  )

  const allErrors = profileError || ratingError || heatmapError

  if (allErrors || !profileData || !ratingData || !heatmapData) return (
    <>
      <SeoHead title={`${username} | CodeChef Profile`} url={`https://codetrace.xyz/codechef/${username}`} />
      <div className="mx-auto max-w-5xl px-4 py-8">
        <AppHeader />
        <ErrorBadge message={(allErrors as Error)?.message ?? 'Failed to load CodeChef stats'} />
      </div>
    </>
  )

  const profile = profileData.profile
  const ratingHistory = ratingData.ratingData ?? []
  const ratingChartHistory = ratingHistory.map((point, index) => ({
    contestId: index,
    contestName: point.name,
    rank: Number(point.rank) || 0,
    oldRating: index === 0 ? Number(point.rating) || 0 : Number(ratingHistory[index - 1]?.rating) || 0,
    newRating: Number(point.rating) || 0,
  }))

  const contestHistory = profileData.contestHistory ?? []
  const chronological = [...contestHistory].sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0))
  const debutRating = chronological.find(c => c.rating != null)?.rating ?? null
  const debutDate = chronological.find(c => c.timestamp != null)?.timestamp ?? null
  const current = profile.currentRating ?? profile.highestRating ?? 0
  const peak = profile.highestRating ?? current
  const climb = debutRating != null ? current - debutRating : null
  const bestRank = contestHistory.reduce<number | null>(
    (min, c) => (c.ranking != null ? (min == null ? c.ranking : Math.min(min, c.ranking)) : min),
    null,
  )
  const perfByName = new Map<string, { ranking: number | null; problemsSolved: number | null }>()
  for (const c of contestHistory) {
    if (c.name) perfByName.set(c.name.trim(), { ranking: c.ranking, problemsSolved: c.problemsSolved })
  }

  const bandMin = Math.min(debutRating ?? current, current, peak, 0)
  const bandMax = Math.max(current, peak, debutRating ?? 0) || 1
  const bandSpan = Math.max(bandMax - bandMin, 1)
  const pct = (v: number) => `${Math.round(((v - bandMin) / bandSpan) * 100)}%`

  const yearly = [...(heatmapData.yearlyContributions ?? [])].sort((a, b) => b.year - a.year)
  const yearlyMax = Math.max(1, ...yearly.map(y => y.totalSubmissions))

  const calendar = (() => {
    const nextCalendar: Record<string, number> = {}
    for (const entry of heatmapData.heatMap ?? []) {
      const parts = entry.date.split('-')
      if (parts.length !== 3) continue
      const yyyy = parts[0]
      const mm = parts[1].padStart(2, '0')
      const dd = parts[2].padStart(2, '0')
      nextCalendar[`${yyyy}-${mm}-${dd}`] = entry.value
    }
    return nextCalendar
  })()

  const heatmapPeriodLabel = heatmapView === 'year'
    ? String(selectedYear)
    : heatmapView === 'all'
      ? 'all recorded activity'
      : 'the last 365 days'

  const heroBadges = profile.stars && (
    <Badge variant="outline" style={{ color: ACCENT, borderColor: `color-mix(in srgb, ${ACCENT} 30%, transparent)` }}>
      {profile.stars}
    </Badge>
  )

  const heroSubtitle = profile.countryName && (
    <span className="flex items-center gap-2">
      {profile.countryFlag && <img src={profile.countryFlag} alt="flag" className="h-3 rounded-[2px]" />}
      {profile.countryName}
    </span>
  )

  return (
    <>
      <SeoHead
        title={`${profileData.handle} | CodeChef Profile`}
        description={`CodeChef stats for ${profileData.handle}: rating, contests, and performance.`}
        url={`https://codetrace.xyz/codechef/${profileData.handle}`}
      />
      <div className="mx-auto max-w-5xl px-4 py-8">
      <AppHeader />

      <PageHero
        platform="codechef"
        title={profile.name || profileData.handle}
        subtitle={heroSubtitle}
        avatarSrc={profile.profile ?? undefined}
        avatarFallback={profileData.handle}
        badges={heroBadges}
        stats={[
          { value: profile.currentRating ?? 0, label: 'Current Rating' },
          { value: profile.highestRating ?? 0, label: 'Max Rating' },
        ]}
      />

      <SectionGroup>
        <Section title="Overview" accent={ACCENT}>
          <StatBand
            accent={ACCENT}
            stats={[
              { value: profile.currentRating ?? 0, label: 'Current Rating' },
              { value: profile.highestRating ?? 0, label: 'Peak Rating' },
              { value: profile.totalSolved ?? 0, label: 'Problems Solved' },
              { value: profile.contestsCount ?? 0, label: 'Contests' },
            ]}
          />
          {(profile.globalRank != null || profile.countryRank != null || profile.stars) && (
            <>
              <Separator />
              <div className="flex flex-wrap gap-6 text-xs font-mono text-muted-foreground">
                {profile.stars && <span>{profile.stars} rated</span>}
                {profile.globalRank != null && <span>Global rank: {profile.globalRank.toLocaleString()}</span>}
                {profile.countryRank != null && <span>Country rank: {profile.countryRank.toLocaleString()}</span>}
                {profile.countryName && <span>{profile.countryName}</span>}
              </div>
            </>
          )}
        </Section>

        {debutRating != null && (
          <Section title="Career Trajectory" accent={ACCENT}>
            <div className="flex flex-col gap-5">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <MetricTile
                  value={Math.round(debutRating).toLocaleString()}
                  label="Debut Rating"
                  sub={debutDate ? formatDisplayDate(debutDate, { month: 'short', year: 'numeric' }) ?? undefined : undefined}
                />
                <MetricTile value={Math.round(peak).toLocaleString()} label="Peak Rating" accent={ACCENT} />
                <MetricTile
                  value={climb != null ? `${climb >= 0 ? '+' : ''}${Math.round(climb).toLocaleString()}` : '—'}
                  label="Total Climb"
                  sub={chronological.length > 1 ? `over ${chronological.length} contests` : undefined}
                />
                <MetricTile
                  value={bestRank != null ? `#${bestRank.toLocaleString()}` : '—'}
                  label="Best Rank"
                />
              </div>

              <div className="flex flex-col gap-2 pt-1">
                <div className="relative h-2 rounded-full bg-secondary/60">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{ width: pct(current), background: CHEF_GRADIENT }}
                  />
                  {peak > current && (
                    <div
                      className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-background"
                      style={{ left: pct(peak), background: '#c98b3f' }}
                      title={`Peak ${Math.round(peak)}`}
                    />
                  )}
                  <div
                    className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background"
                    style={{ left: pct(current), background: ACCENT }}
                    title={`Current ${Math.round(current)}`}
                  />
                </div>
                <div className="flex justify-between font-mono text-[10px] text-muted-foreground/70">
                  <span>{Math.round(debutRating).toLocaleString()} debut</span>
                  <span style={{ color: ACCENT }}>{Math.round(current).toLocaleString()} now</span>
                </div>
              </div>
            </div>
          </Section>
        )}

        <Section title="Activity Pulse" accent={ACCENT}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <MetricTile value={heatmapData.totalSubmissions.toLocaleString()} label="Submissions" accent={ACCENT} />
            <MetricTile value={heatmapData.totalActiveDays.toLocaleString()} label="Active Days" />
            <MetricTile value={`${heatmapData.currentStreak}d`} label="Current Streak" />
            <MetricTile value={`${heatmapData.longestStreak}d`} label="Longest Streak" />
            <MetricTile value={heatmapData.maxDailySubmissions.toLocaleString()} label="Busiest Day" />
          </div>

          {yearly.length > 0 && (
            <>
              <Separator />
              <div className="flex flex-col gap-3">
                <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/70">By Year</span>
                <div className="flex flex-col gap-2.5">
                  {yearly.map(y => (
                    <div key={y.year} className="flex items-center gap-3 text-xs font-mono">
                      <span className="w-10 shrink-0 text-muted-foreground">{y.year}</span>
                      <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-secondary/60">
                        <div
                          className="absolute inset-y-0 left-0 rounded-full"
                          style={{ width: `${Math.max(4, (y.totalSubmissions / yearlyMax) * 100)}%`, background: CHEF_GRADIENT }}
                        />
                      </div>
                      <span className="w-28 shrink-0 text-right text-muted-foreground/80">
                        {y.totalSubmissions.toLocaleString()} subs · {y.activeDays}d
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </Section>

        {ratingChartHistory.length > 1 && (
          <Section title="Rating Curve" accent={ACCENT}>
            <RatingChart history={ratingChartHistory} height={132} color={ACCENT} />
          </Section>
        )}

        {ratingHistory.length > 0 && (
          <Section title="Recent Contest Performance" accent={ACCENT}>
            <Table className="editorial-table">
              <TableHeader>
                <TableRow>
                  <TableHead className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Contest</TableHead>
                  <TableHead className="text-right font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Rank</TableHead>
                  <TableHead className="hidden text-right font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground sm:table-cell">Solved</TableHead>
                  <TableHead className="text-right font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Rating</TableHead>
                  <TableHead className="text-right font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...ratingHistory].reverse().slice(0, 20).map((point, i) => {
                  const date = point.end_date
                    ? new Date(point.end_date).toLocaleDateString('en', { month: 'short', day: 'numeric', year: '2-digit' })
                    : null
                  const perf = point.name ? perfByName.get(point.name.trim()) : undefined
                  const ranking = point.rank || (perf?.ranking != null ? perf.ranking.toLocaleString() : null)
                  return (
                    <TableRow key={i}>
                      <TableCell>
                        <div className="max-w-[300px] truncate font-mono text-foreground">{point.name}</div>
                        <div className="text-[10px] text-muted-foreground/60">{point.code}</div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground tnum">{ranking ?? '—'}</TableCell>
                      <TableCell className="hidden text-right font-mono text-muted-foreground tnum sm:table-cell">
                        {perf?.problemsSolved != null ? perf.problemsSolved : '—'}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium tnum" style={{ color: point.color || 'var(--foreground)' }}>
                        {point.rating}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-muted-foreground">{date}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Section>
        )}

        <div className="flex flex-col gap-3">
          <ActivityFilterBar
            title="Contribution Graph"
            description="CodeChef exposes distinct archive, trailing-year, and explicit-year heatmap windows. This page uses them directly so the grid and totals stay in sync with the selected slice."
            options={[...HEATMAP_VIEWS]}
            value={heatmapView}
            onValueChange={value => handleHeatmapViewChange(value as 'all' | 'last_365' | 'year')}
            years={heatmapView === 'year' ? availableHeatmapYears : []}
            selectedYear={heatmapView === 'year' ? selectedYear : null}
            onYearChange={setSelectedYear}
            meta={[
              `${heatmapData.totalSubmissions.toLocaleString()} submissions`,
              `${heatmapData.totalActiveDays.toLocaleString()} active days`,
              `${heatmapData.longestStreak}d longest streak`,
              heatmapData.lastActiveDate ? `Last active ${formatDisplayDate(heatmapData.lastActiveDate)}` : 'No recent activity yet',
            ]}
          />

          {heatmapData.heatMap.length > 0 ? (
            <UniversalHeatmap
              calendar={calendar}
              totalSubmissions={heatmapData.totalSubmissions}
              activeDays={heatmapData.totalActiveDays}
              maxStreak={heatmapData.longestStreak}
              startDate={heatmapData.firstActiveDate ?? undefined}
              endDate={heatmapData.lastActiveDate ?? undefined}
              periodLabel={heatmapPeriodLabel}
              label="submissions"
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-1 border-y border-border/40 py-12 text-center">
              <p className="font-mono text-sm text-muted-foreground">No submissions in {heatmapPeriodLabel}.</p>
              {availableHeatmapYears.length > 0 && (
                <p className="font-mono text-xs text-muted-foreground/60">
                  Try a year with activity ({availableHeatmapYears.join(', ')}).
                </p>
              )}
            </div>
          )}
        </div>
      </SectionGroup>

      <AppFooter />
    </div>
    </>
  )
}
