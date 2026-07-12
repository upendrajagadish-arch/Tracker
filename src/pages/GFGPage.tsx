import { useState } from 'react'
import { useParams } from '@tanstack/react-router'
import { SeoHead } from '@/components/SeoHead'
import { ExternalLink } from 'lucide-react'
import { useGFGStats, useGFGProfile, useGFGHeatmap } from '../hooks/usePlatform'
import { UniversalHeatmap } from '../components/UniversalHeatmap'
import { ActivityFilterBar } from '../components/ActivityFilterBar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { PlatformIcon } from '../components/PlatformIcon'
import { formatDisplayDate } from '@/lib/utils'
import { Section, SectionGroup } from '../components/Section'
import { PageHero } from '../components/PageHero'
import { AppHeader } from '../components/AppHeader'
import { AppFooter } from '../components/AppFooter'
import { PLATFORM_ACCENT } from '../components/platformMeta'
import { StatBand } from '../components/StatBand'
import { DetailSkeleton } from '../components/DetailSkeleton'

const ACCENT = PLATFORM_ACCENT.gfg

const DIFFICULTIES = [
  { key: 'School' as const, color: '#94a3b8', label: 'School' },
  { key: 'Basic' as const, color: '#64ffda', label: 'Basic' },
  { key: 'Easy' as const, color: '#2db55d', label: 'Easy' },
  { key: 'Medium' as const, color: '#ffa116', label: 'Medium' },
  { key: 'Hard' as const, color: '#ef4444', label: 'Hard' },
]

const HEATMAP_RANGES = [
  { value: 'last_365', label: '365D' },
  { value: 'year', label: 'Year' },
] as const

export function GFGPage() {
  const { username } = useParams({ from: '/gfg/$username' })
  const [heatmapRange, setHeatmapRange] = useState<'all' | 'last_365' | 'year'>('last_365')
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())



  const { data: stats, isLoading: statsLoading, error: statsError } = useGFGStats(username)
  const { data: profile, isLoading: profileLoading } = useGFGProfile(username)
  const { data: heatmapData } = useGFGHeatmap(username, {
    view: heatmapRange,
    year: heatmapRange === 'year' ? selectedYear : null,
  })

  const availableHeatmapYears = heatmapData?.availableYears ?? []

  function handleHeatmapRangeChange(value: 'all' | 'last_365' | 'year') {
    setHeatmapRange(value)
    if (value === 'year' && availableHeatmapYears.length > 0 && !availableHeatmapYears.includes(selectedYear)) {
      setSelectedYear(availableHeatmapYears[0])
    }
  }

  const isLoading = statsLoading || profileLoading

  if (isLoading) return (
    <>
      <SeoHead title={`${username} | GeeksForGeeks Profile`} url={`https://codetrace.xyz/gfg/${username}`} />
      <div className="mx-auto max-w-5xl px-4 py-8">
        <AppHeader />
        <div className="mt-6"><DetailSkeleton /></div>
      </div>
    </>
  )

  if (statsError || !stats) return (
    <>
      <SeoHead title={`${username} | GeeksForGeeks Profile`} url={`https://codetrace.xyz/gfg/${username}`} />
      <div className="mx-auto max-w-5xl px-4 py-8 flex flex-col gap-6">
        <AppHeader />
        <Card>
          <CardContent>
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <PlatformIcon platform="gfg" className="size-12 text-[var(--platform-gfg)] opacity-20" />
              <h2 className="text-xl font-display font-bold text-foreground">GeeksForGeeks Stats Unavailable</h2>
              <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
                {(statsError as Error)?.message ?? 'GFG API is currently unable to fetch stats — GeeksForGeeks recently changed their page structure.'}
              </p>
              <Button variant="link" size="sm" asChild className="text-primary mt-2">
                <a
                  href={`https://auth.geeksforgeeks.org/user/${username}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  View profile on GeeksForGeeks
                  <ExternalLink data-icon="inline-end" />
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )

  const heatmapCalendar: Record<string, number> = {}
  if (heatmapData?.heatmap) {
    for (const entry of heatmapData.heatmap) {
      heatmapCalendar[entry.date] = entry.count
    }
  }

  const heatmapPeriodLabel = heatmapRange === 'year'
    ? String(selectedYear)
    : heatmapRange === 'all'
      ? 'all recorded activity'
      : 'the last 365 days'

  return (
    <>
      <SeoHead
        title={`${username} | GeeksForGeeks Profile`}
        description={`GeeksForGeeks stats for ${username}: problems solved, coding score, and DSA progress.`}
        url={`https://codetrace.xyz/gfg/${username}`}
      />
      <div className="mx-auto max-w-5xl px-4 py-8">
      <AppHeader />

      <PageHero
        platform="gfg"
        title={username}
        subtitle={profile?.institute}
        avatarSrc={profile?.profilePicture}
        avatarFallback={username}
        stats={[{ value: stats.totalProblemsSolved, label: 'Total Solved' }]}
      />

      <SectionGroup>
        {profile && (
          <Section title="Profile" accent={ACCENT}>
            <StatBand
              accent={ACCENT}
              stats={[
                ...(Number(profile.codingScore) > 0 ? [{ value: Number(profile.codingScore), label: 'Coding Score' }] : []),
                ...(Number(profile.monthlyScore) > 0 ? [{ value: Number(profile.monthlyScore), label: 'Monthly Score' }] : []),
                ...(Number(profile.currentStreak) > 0 ? [{ value: Number(profile.currentStreak), label: 'Current Streak', suffix: 'd' }] : []),
                ...(Number(profile.maxStreak) > 0 ? [{ value: Number(profile.maxStreak), label: 'Max Streak', suffix: 'd' }] : []),
              ]}
            />
            {Number(profile.instituteRank) > 0 && (
              <>
                <Separator />
                <div className="flex items-center gap-2 text-sm font-mono text-muted-foreground">
                  <span>Institute Rank:</span>
                  <Badge variant="outline" className="text-primary">#{Number(profile.instituteRank)}</Badge>
                </div>
              </>
            )}
          </Section>
        )}

        {heatmapData && ((heatmapData.availableYears?.length ?? 0) > 0 || Object.keys(heatmapCalendar).length > 0) && (
          <div className="flex flex-col gap-3">
            <ActivityFilterBar
              title="Activity Lens"
              description="The heatmap endpoint now supports archive, rolling-year, and exact-year slices. This lets the page replay how your GFG practice changed over time instead of showing a single default window."
              options={[...HEATMAP_RANGES]}
              value={heatmapRange}
              onValueChange={value => handleHeatmapRangeChange(value as 'all' | 'last_365' | 'year')}
              years={heatmapRange === 'year' ? availableHeatmapYears : []}
              selectedYear={heatmapRange === 'year' ? selectedYear : null}
              onYearChange={setSelectedYear}
              meta={[
                `${heatmapData.totalSubmissions.toLocaleString()} submissions`,
                `${heatmapData.totalActiveDays} active days`,
                `${formatDisplayDate(heatmapData.fromDate)} - ${formatDisplayDate(heatmapData.toDate)}`,
              ]}
            />

            <UniversalHeatmap
              calendar={heatmapCalendar}
              totalSubmissions={heatmapData.totalSubmissions}
              activeDays={heatmapData.totalActiveDays}
              maxStreak={Number(profile?.maxStreak ?? 0)}
              startDate={heatmapData.fromDate}
              endDate={heatmapData.toDate}
              periodLabel={heatmapPeriodLabel}
            />
          </div>
        )}

        <Section title="Problem Difficulty Breakdown" accent={ACCENT}>
          <div className="grid grid-cols-5 gap-3">
            {DIFFICULTIES.map(({ key, color, label }) => (
              <div key={key} className="tile flex flex-col items-center gap-2 px-2 py-4 text-center">
                <span className="font-serif text-3xl font-light leading-none" style={{ color }}>{stats[key]}</span>
                <span
                  className="rounded-full border px-2 py-0.5 text-[10px] font-mono uppercase tracking-[0.15em]"
                  style={{ color, borderColor: `color-mix(in srgb, ${color} 30%, transparent)` }}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-3 mt-1">
            {DIFFICULTIES.filter(d => stats[d.key] > 0).map(({ key, color, label }) => {
              const pct = stats.totalProblemsSolved > 0 ? (stats[key] / stats.totalProblemsSolved) * 100 : 0
              return (
                <div key={key} className="flex items-center gap-3">
                  <span className="w-14 flex-shrink-0 text-xs" style={{ color }}>{label}</span>
                  <div className="flex-1 h-2 rounded-full bg-border">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
                  </div>
                  <span className="w-8 text-right font-mono text-xs text-muted-foreground tnum">{stats[key]}</span>
                </div>
              )
            })}
          </div>
        </Section>
      </SectionGroup>

      <AppFooter />
    </div>
    </>
  )
}
