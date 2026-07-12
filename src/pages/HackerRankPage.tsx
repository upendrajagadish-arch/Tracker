import { useState } from 'react'
import { useParams } from '@tanstack/react-router'
import { SeoHead } from '@/components/SeoHead'
import { ExternalLink } from 'lucide-react'
import { useHackerRankDetail, useHackerRankHeatmap } from '../hooks/usePlatform'
import { DifficultyMeter } from '../components/DifficultyMeter'
import { UniversalHeatmap } from '../components/UniversalHeatmap'
import { ActivityFilterBar } from '../components/ActivityFilterBar'
import { RatingChart } from '../components/RatingChart'
import { ErrorBadge } from '../components/ErrorBadge'
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
import { DifficultyBreakdown } from '../components/DifficultyBreakdown'
import { BadgeGrid } from '../components/BadgeGrid'
import { DetailSkeleton } from '../components/DetailSkeleton'

const ACCENT = PLATFORM_ACCENT.hackerrank

const HEATMAP_VIEWS = [
  { value: 'last_365', label: '365D' },
  { value: 'year', label: 'Year' },
] as const

function formatRank(value?: number | null) {
  return value && value > 0 ? `#${value.toLocaleString()}` : 'n/a'
}

function MetricBlock({ value, label, accent = false }: { value: string | number; label: string; accent?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className={`font-serif text-3xl font-light leading-none ${accent ? 'text-primary' : 'text-foreground'}`}>{value}</span>
      <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">{label}</span>
    </div>
  )
}

export function HackerRankPage() {
  const { username } = useParams({ from: '/hackerrank/$username' })
  const [heatmapView, setHeatmapView] = useState<'all' | 'last_365' | 'year'>('last_365')
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())



  const { data, isLoading, error } = useHackerRankDetail(username)
  const { data: heatmapData } = useHackerRankHeatmap(username, {
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

  const heatmapPeriodLabel =
    heatmapView === 'year' ? String(selectedYear) : heatmapView === 'all' ? 'all time' : 'the past year'

  if (isLoading) return (
    <>
      <SeoHead title={`${username} | HackerRank Profile`} url={`https://codetrace.xyz/hackerrank/${username}`} />
      <div className="mx-auto max-w-5xl px-4 py-8">
        <AppHeader />
        <div className="mt-6"><DetailSkeleton /></div>
      </div>
    </>
  )

  if (error || !data) return (
    <>
      <SeoHead title={`${username} | HackerRank Profile`} url={`https://codetrace.xyz/hackerrank/${username}`} />
      <div className="mx-auto max-w-5xl px-4 py-8">
        <AppHeader />
        <ErrorBadge message={(error as Error)?.message ?? 'Failed to load HackerRank stats'} />
      </div>
    </>
  )

  const { contestInfo } = data
  const hasDifficultyBreakdown = data.totalEasy > 0 || data.totalMedium > 0 || data.totalHard > 0
  const totalSubmissions = Object.values(data.submissionCalendar).reduce((sum, count) => sum + Number(count || 0), 0)

  const contestRatingHistory = contestInfo?.contestHistory
    ?.filter(c => c.attended)
    .map((c, i) => ({
      contestId: i,
      contestName: c.contest.title,
      rank: c.ranking,
      newRating: Math.round(c.rating),
      oldRating: i === 0 ? Math.round(c.rating) : Math.round(contestInfo.contestHistory.filter(x => x.attended)[i - 1]?.rating ?? c.rating),
    })) ?? []

  const socialLinks = [
    { label: 'GitHub', url: data.githubUrl },
    { label: 'Twitter', url: data.twitterUrl },
    { label: 'LinkedIn', url: data.linkedinUrl },
    ...(data.profile?.websites ?? []).slice(0, 3).map((url, index) => ({ label: `Site ${index + 1}`, url })),
  ].filter(link => !!link.url)

  const practiceScoreRows = data.submitStats?.acSubmissionNum.filter(row => row.difficulty !== 'All') ?? []
  const attemptRows = data.submitStats?.totalSubmissionNum ?? []
  const submissionPanels = [
    { title: 'Practice Scores', rows: practiceScoreRows, kind: 'score' },
    { title: 'All Attempts', rows: attemptRows, kind: 'attempts' },
  ].filter(panel => panel.rows.length > 0)

  const heroBadges = (
    <>
      {data.profile?.starRating && (
        <Badge variant="outline" className="text-[10px] font-mono">{data.profile.starRating} ★</Badge>
      )}
      {data.activeBadge && (
        <Badge variant="outline" className="border-primary/30 text-[10px] font-mono text-primary">
          Active: {data.activeBadge.displayName}
        </Badge>
      )}
    </>
  )

  return (
    <>
      <SeoHead
        title={`${username} | HackerRank Profile`}
        description={`HackerRank stats for ${username}: badges, certifications, and solved problems.`}
        url={`https://codetrace.xyz/hackerrank/${username}`}
      />
      <div className="mx-auto max-w-5xl px-4 py-8">
      <AppHeader />

      <PageHero
        platform="hackerrank"
        title={username}
        subtitle={data.profile?.realName && data.profile.realName !== username ? data.profile.realName : undefined}
        avatarSrc={data.profile?.userAvatar}
        avatarFallback={username}
        badges={heroBadges}
        stats={[
          { value: data.totalSolved, label: 'Solved' },
          { value: data.practiceScore, label: 'Practice Score' },
        ]}
      />

      <SectionGroup>
        <Section title="Overview" accent={ACCENT}>
          <StatBand
            accent={ACCENT}
            stats={[
              { value: data.totalSolved, label: 'Solved Challenges' },
              { value: data.practiceScore, label: 'Practice Score' },
              { value: totalSubmissions, label: 'All Attempts' },
              { custom: <MetricBlock value={formatRank(data.ranking)} label="Best Track Rank" accent /> },
              ...(contestInfo ? [{ value: contestInfo.attendedContestsCount, label: 'Contests' }] : []),
            ]}
          />
          {data.profile && (
            <>
              <Separator />
              <div className="flex flex-wrap gap-4 text-xs font-mono text-muted-foreground">
                {data.profile.countryName && <span>{data.profile.countryName}</span>}
                {data.profile.company && <span>{data.profile.company}</span>}
                {data.profile.school && <span>{data.profile.school}</span>}
                {data.profile.skillTags?.slice(0, 6).map(tag => (
                  <Badge key={tag} variant="outline" className="text-xs font-mono">{tag}</Badge>
                ))}
              </div>
            </>
          )}
        </Section>

        {(data.profile || data.contributions || socialLinks.length > 0 || contestInfo) && (
          <Section title="Profile Signal" accent={ACCENT}>
            <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="pt-1">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-mono text-foreground">Presence & reputation</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {data.profile?.birthday ? `Birthday ${formatDisplayDate(data.profile.birthday, { month: 'short', day: 'numeric' })}` : 'Expanded from the live profile endpoint'}
                    </div>
                  </div>
                  {contestInfo?.badge && (
                    <Badge variant="outline" className="border-primary/30 text-primary">{contestInfo.badge.name}</Badge>
                  )}
                </div>

                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                  {data.profile?.aboutMe?.trim() || 'No public bio was returned. The backend now exposes richer profile, social, contest, and submission metadata, so this page can surface reputation and activity beyond the basic solve totals.'}
                </p>

                {socialLinks.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {socialLinks.map(link => (
                      <a
                        key={`${link.label}-${link.url}`}
                        href={link.url!}
                        target="_blank"
                        rel="noreferrer"
                        className="link-quiet inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-3 py-1.5 text-[11px] font-mono text-muted-foreground hover:border-primary/30 hover:text-primary"
                      >
                        {link.label}
                        <ExternalLink className="size-3" />
                      </a>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Reputation', value: data.reputation.toLocaleString() },
                  { label: 'Practice Score', value: data.practiceScore.toLocaleString() },
                  { label: 'Best Track Rank', value: formatRank(data.ranking) },
                  { label: 'Contest Rank', value: formatRank(contestInfo?.globalRanking) },
                ].map(metric => (
                  <div key={metric.label} className="tile flex flex-col gap-1.5 px-4 py-3.5">
                    <span className="font-serif text-2xl font-light leading-none text-foreground">{metric.value}</span>
                    <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">{metric.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </Section>
        )}

        {hasDifficultyBreakdown && (
          <Section title="Problem Breakdown" accent={ACCENT}>
            <DifficultyBreakdown
              easy={{ label: 'Easy', solved: data.easySolved, total: data.totalEasy, color: '#2db55d' }}
              medium={{ label: 'Medium', solved: data.mediumSolved, total: data.totalMedium, color: '#ffa116' }}
              hard={{ label: 'Hard', solved: data.hardSolved, total: data.totalHard, color: '#ef4444' }}
            />
            <DifficultyMeter
              easySolved={data.easySolved} mediumSolved={data.mediumSolved} hardSolved={data.hardSolved}
              totalEasy={data.totalEasy} totalMedium={data.totalMedium} totalHard={data.totalHard}
            />
          </Section>
        )}

        {heatmapData ? (
          <div className="flex flex-col gap-3">
            <ActivityFilterBar
              title="Activity Lens"
              description="The heatmap endpoint now supports archive, trailing-year, and explicit-year windows. Switch windows to replay how your HackerRank practice changed over time."
              options={[...HEATMAP_VIEWS]}
              value={heatmapView}
              onValueChange={value => handleHeatmapViewChange(value as 'all' | 'last_365' | 'year')}
              years={heatmapView === 'year' ? availableHeatmapYears : []}
              selectedYear={heatmapView === 'year' ? selectedYear : null}
              onYearChange={setSelectedYear}
              meta={[
                `${heatmapData.totalSubmissions.toLocaleString()} submissions`,
                `${heatmapData.activeDays} active days`,
                `${heatmapData.longestStreak}d max streak`,
              ]}
            />
            <UniversalHeatmap
              hackerrankHeatmap={heatmapData}
              startDate={heatmapData.startDate || undefined}
              endDate={heatmapData.endDate || undefined}
              periodLabel={heatmapPeriodLabel}
            />
          </div>
        ) : Object.keys(data.submissionCalendar).length > 0 ? (
          <UniversalHeatmap calendar={data.submissionCalendar} />
        ) : null}

        {submissionPanels.length > 0 && (
          <Section title="Submission Pulse" accent={ACCENT}>
            <div className="grid gap-5 md:grid-cols-2">
              {submissionPanels.map(panel => (
                <div key={panel.title} className="tile flex flex-col gap-3 px-4 py-4">
                  <div className="text-sm font-mono text-foreground">{panel.title}</div>
                  <div className="space-y-2">
                    {panel.rows.map(row => {
                      const isScorePanel = panel.kind === 'score'
                      const secondary = isScorePanel
                        ? row.rank && row.rank > 0 ? `${formatRank(row.rank)} track rank` : 'track score'
                        : `${row.count.toLocaleString()} total`
                      const value = isScorePanel ? row.count : row.submissions
                      const label = isScorePanel ? 'score' : 'submissions'

                      return (
                        <div key={`${panel.title}-${row.difficulty}`} className="flex items-center justify-between gap-3 border-b border-border/40 py-2 last:border-b-0">
                          <div>
                            <div className="text-xs font-mono text-foreground">{row.difficulty}</div>
                            <div className="text-[10px] text-muted-foreground">{secondary}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-mono text-primary tnum">{value.toLocaleString()}</div>
                            <div className="text-[10px] text-muted-foreground">{label}</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {contestRatingHistory.length > 1 && (
          <Section title="Contest Rating History" accent={ACCENT}>
            <RatingChart history={contestRatingHistory} height={120} color={ACCENT} />
          </Section>
        )}

        {contestInfo && contestInfo.contestHistory.length > 0 && (
          <Section title={`Contest History (${contestInfo.attendedContestsCount} attended)`} accent={ACCENT}>
            <Table className="editorial-table">
              <TableHeader>
                <TableRow>
                  <TableHead className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Contest</TableHead>
                  <TableHead className="text-right font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Rank</TableHead>
                  <TableHead className="text-right font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Solved</TableHead>
                  <TableHead className="text-right font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Rating</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contestInfo.contestHistory.filter(c => c.attended).slice(-20).reverse().map((c, i) => {
                  const history = contestInfo.contestHistory.filter(x => x.attended).slice(-20).reverse()
                  const delta = i < history.length - 1
                    ? Math.round(c.rating - (history[i+1]?.rating ?? c.rating))
                    : null
                  return (
                    <TableRow key={c.contest.title + c.contest.startTime}>
                      <TableCell className="max-w-[200px] truncate font-mono text-foreground">{c.contest.title}</TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground tnum">{c.ranking.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground tnum">{c.problemsSolved}/{c.totalProblems}</TableCell>
                      <TableCell className="text-right font-mono">
                        <span className="text-foreground tnum">{Math.round(c.rating)}</span>
                        {delta !== null && delta !== 0 && (
                          <span className="ml-1.5 tnum" style={{ color: delta > 0 ? '#2db55d' : '#ef4444' }}>
                            {delta > 0 ? '↑' : '↓'}{Math.abs(delta)}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Section>
        )}

        {data.recentSubmissions.length > 0 && (
          <Section title={`Recent Challenges (${data.recentSubmissions.length})`} accent={ACCENT}>
            <Table className="editorial-table">
              <TableHeader>
                <TableRow>
                  <TableHead className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Challenge</TableHead>
                  <TableHead className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Status</TableHead>
                  <TableHead className="text-right font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Activity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentSubmissions.map(submission => (
                  <TableRow key={`${submission.titleSlug}-${submission.timestamp}`}>
                    <TableCell className="font-mono text-foreground">{submission.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">{submission.statusDisplay}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground">
                      {submission.timestamp > 0
                        ? new Date(submission.timestamp * 1000).toLocaleString('en', {
                            month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                          })
                        : 'Unknown'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Section>
        )}

        {(data.badges.length > 0 || data.upcomingBadges.length > 0) && (
          <Section title="Badges" accent={ACCENT}>
            <BadgeGrid
              active={data.activeBadge ?? undefined}
              badges={data.badges}
              upcoming={data.upcomingBadges.map(b => ({ id: b.name, ...b }))}
            />
          </Section>
        )}
      </SectionGroup>

      <AppFooter />
    </div>
    </>
  )
}
