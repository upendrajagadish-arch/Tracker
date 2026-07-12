import { useState } from 'react'
import { useParams } from '@tanstack/react-router'
import { SeoHead } from '@/components/SeoHead'
import { ExternalLink } from 'lucide-react'
import { useCodeforcesDetail, useCodeforcesHeatmap, useUpcomingContests } from '../hooks/usePlatform'
import { RatingChart } from '../components/RatingChart'
import { UniversalHeatmap } from '../components/UniversalHeatmap'
import { ErrorBadge } from '../components/ErrorBadge'
import { ActivityFilterBar } from '../components/ActivityFilterBar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { formatDisplayDate, formatDurationShort } from '@/lib/utils'
import { Section, SectionGroup } from '../components/Section'
import { PageHero } from '../components/PageHero'
import { AppHeader } from '../components/AppHeader'
import { AppFooter } from '../components/AppFooter'
import { PLATFORM_ACCENT } from '../components/platformMeta'
import { StatBand } from '../components/StatBand'
import { DetailSkeleton } from '../components/DetailSkeleton'

const ACCENT = PLATFORM_ACCENT.codeforces

const RANK_COLORS: Record<string, string> = {
  'legendary grandmaster': '#ff0000',
  'international grandmaster': '#ff3300',
  'grandmaster': '#ff5500',
  'international master': '#ff8800',
  'master': '#ffaa00',
  'candidate master': '#cc00cc',
  'expert': '#5555ff',
  'specialist': '#03a89e',
  'pupil': '#77ff77',
  'newbie': '#808080',
}

const HEATMAP_MODES = [
  { value: 'last_365', label: '365D' },
  { value: 'year', label: 'Year' },
] as const

function rankColor(rank: string | null | undefined) {
  if (!rank) return 'var(--color-muted)'
  return RANK_COLORS[rank.toLowerCase()] ?? 'var(--color-muted)'
}

export function CodeforcesPage() {
  const { username } = useParams({ from: '/codeforces/$username' })
  const [heatmapMode, setHeatmapMode] = useState<'all' | 'last_365' | 'year'>('last_365')
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())



  const { data, isLoading, error } = useCodeforcesDetail(username)

  const { data: heatmapData } = useCodeforcesHeatmap(
    username,
    heatmapMode === 'year' ? { view: 'year', year: selectedYear } : { view: heatmapMode },
  )

  const { data: upcomingContests } = useUpcomingContests()

  const availableHeatmapYears = heatmapData?.available_years ?? []

  function handleHeatmapModeChange(value: 'all' | 'last_365' | 'year') {
    setHeatmapMode(value)
    if (value === 'year' && availableHeatmapYears.length > 0 && !availableHeatmapYears.includes(selectedYear)) {
      setSelectedYear(availableHeatmapYears[0])
    }
  }

  if (isLoading) return (
    <>
      <SeoHead title={`${username} | Codeforces Profile`} url={`https://codetrace.xyz/codeforces/${username}`} />
      <div className="mx-auto max-w-5xl px-4 py-8">
        <AppHeader />
        <div className="mt-6"><DetailSkeleton /></div>
      </div>
    </>
  )

  if (error || !data) return (
    <>
      <SeoHead title={`${username} | Codeforces Profile`} url={`https://codetrace.xyz/codeforces/${username}`} />
      <div className="mx-auto max-w-5xl px-4 py-8">
        <AppHeader />
        <ErrorBadge message={(error as Error)?.message ?? 'Failed to load Codeforces stats'} />
      </div>
    </>
  )

  const ratingHistory = data.ratingHistory ?? data.rating_history ?? []
  const heatmapPeriodLabel = heatmapMode === 'year'
    ? String(heatmapData?.year ?? selectedYear)
    : heatmapMode === 'all'
      ? 'all recorded activity'
      : 'the last 365 days'

  const heroBadges = data.rank && (
    <Badge variant="outline" style={{ color: rankColor(data.rank), borderColor: `color-mix(in srgb, ${rankColor(data.rank)} 30%, transparent)` }}>
      {data.rank}
    </Badge>
  )

  return (
    <>
      <SeoHead
        title={`${data.handle} | Codeforces Profile`}
        description={`Codeforces stats for ${data.handle}: contest rating, rank, and performance history.`}
        url={`https://codetrace.xyz/codeforces/${data.handle}`}
      />
      <div className="mx-auto max-w-5xl px-4 py-8">
      <AppHeader />

      <PageHero
        platform="codeforces"
        title={data.handle}
        subtitle={data.organization}
        avatarSrc={data.avatar ?? undefined}
        avatarFallback={data.handle}
        badges={heroBadges}
        stats={[
          { value: data.rating ?? 0, label: 'Current Rating' },
          { value: data.maxRating ?? 0, label: 'Max Rating' },
        ]}
      />

      <SectionGroup>
        <Section title="Overview" accent={ACCENT}>
          <StatBand
            accent={ACCENT}
            stats={[
              { value: data.rating ?? 0, label: 'Current Rating' },
              { value: data.maxRating ?? 0, label: 'Peak Rating' },
              { value: data.solvedCount ?? data.solved_problems_count, label: 'Problems Solved' },
              { value: data.contests_count, label: 'Contests' },
            ]}
          />
          <Separator />
          <div className="flex flex-wrap gap-6 text-xs font-mono text-muted-foreground">
            {data.country && <span>{data.country}{data.city ? `, ${data.city}` : ''}</span>}
            {data.organization && <span>{data.organization}</span>}
            {data.contribution != null && <span>Contribution: {data.contribution}</span>}
            {data.friendOfCount != null && <span>{data.friendOfCount.toLocaleString()} friends</span>}
            {data.registrationTimeSeconds != null && (
              <span>Joined {formatDisplayDate(data.registrationTimeSeconds, { month: 'short', year: 'numeric' })}</span>
            )}
            {data.maxRank && (
              <span>
                Max rank: <span style={{ color: rankColor(data.maxRank) }}>{data.maxRank}</span>
              </span>
            )}
          </div>
        </Section>

        {upcomingContests && upcomingContests.length > 0 && (
          <Section title="Upcoming Contests" accent={ACCENT}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {upcomingContests.map(contest => {
                const content = (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-mono leading-snug text-foreground">{contest.name}</div>
                        {contest.description && (
                          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{contest.description}</p>
                        )}
                      </div>
                      {contest.websiteUrl && <ExternalLink className="size-3 shrink-0 text-muted-foreground" />}
                    </div>
                    <div className="flex flex-wrap gap-2 text-[10px] font-mono text-muted-foreground">
                      <Badge variant="outline" className="text-[10px]">{contest.type ?? 'contest'}</Badge>
                      <Badge variant="outline" className="text-[10px]">{formatDurationShort(contest.durationSeconds)}</Badge>
                      {contest.preparedBy && <Badge variant="outline" className="text-[10px]">by {contest.preparedBy}</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(contest.startTimeSeconds * 1000).toLocaleString('en', {
                        month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
                      })}
                    </div>
                  </>
                )

                return contest.websiteUrl ? (
                  <a
                    key={contest.id}
                    href={contest.websiteUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="link-quiet tile group flex flex-col gap-3 px-4 py-4 hover:border-primary/30"
                  >
                    {content}
                  </a>
                ) : (
                  <div key={contest.id} className="tile flex flex-col gap-3 px-4 py-4">
                    {content}
                  </div>
                )
              })}
            </div>
          </Section>
        )}

        {ratingHistory.length > 1 && (
          <Section title={`Rating History (${ratingHistory.length} contests)`} accent={ACCENT}>
            <RatingChart history={ratingHistory} height={140} color={ACCENT} />
          </Section>
        )}

        {ratingHistory.length > 0 && (
          <Section title="Recent Contest Performance" accent={ACCENT}>
            <Table className="editorial-table">
              <TableHeader>
                <TableRow>
                  <TableHead className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Contest</TableHead>
                  <TableHead className="text-right font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Rank</TableHead>
                  <TableHead className="text-right font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Old</TableHead>
                  <TableHead className="text-right font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">New</TableHead>
                  <TableHead className="text-right font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Δ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...ratingHistory].reverse().slice(0, 20).map((point, i) => {
                  const delta = point.newRating - point.oldRating
                  const date = point.ratingUpdateTimeSeconds
                    ? new Date(point.ratingUpdateTimeSeconds * 1000).toLocaleDateString('en', { month: 'short', day: 'numeric', year: '2-digit' })
                    : null
                  return (
                    <TableRow key={i}>
                      <TableCell>
                        <div className="max-w-[200px] truncate font-mono text-foreground">{point.contestName}</div>
                        {date && <div className="text-[10px] text-muted-foreground/60">{date}</div>}
                      </TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground tnum">{point.rank.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground tnum">{point.oldRating}</TableCell>
                      <TableCell className="text-right font-mono text-foreground tnum">{point.newRating}</TableCell>
                      <TableCell className="text-right font-mono font-medium tnum" style={{ color: delta >= 0 ? '#2db55d' : '#ef4444' }}>
                        {delta >= 0 ? '+' : ''}{delta}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Section>
        )}

        {heatmapData && ((heatmapData.available_years?.length ?? 0) > 0 || (heatmapData.heatmap?.length ?? 0) > 0) && (
          <div className="flex flex-col gap-3">
            <ActivityFilterBar
              title="Activity Lens"
              description="Switch between a short pulse check, the standard yearly runway, or a full calendar season. These controls are driven directly by the newer heatmap API ranges."
              options={[...HEATMAP_MODES]}
              value={heatmapMode}
              onValueChange={value => handleHeatmapModeChange(value as 'all' | 'last_365' | 'year')}
              years={heatmapMode === 'year' ? availableHeatmapYears : []}
              selectedYear={heatmapMode === 'year' ? selectedYear : null}
              onYearChange={setSelectedYear}
              meta={[
                `${heatmapData.total_accepted.toLocaleString()} accepted`,
                `${heatmapData.current_streak}d live streak`,
                `${formatDisplayDate(heatmapData.start_date, { month: 'short', day: 'numeric', year: 'numeric' })} - ${formatDisplayDate(heatmapData.end_date, { month: 'short', day: 'numeric', year: 'numeric' })}`,
              ]}
            />

            <UniversalHeatmap
              calendar={Object.fromEntries(
                heatmapData.heatmap.map(day => [day.date, day.submissions])
              )}
              totalSubmissions={heatmapData.total_submissions}
              activeDays={heatmapData.active_days}
              maxStreak={heatmapData.longest_streak}
              startDate={heatmapData.start_date}
              endDate={heatmapData.end_date}
              periodLabel={heatmapPeriodLabel}
            />
          </div>
        )}
      </SectionGroup>

      <AppFooter />
    </div>
    </>
  )
}
