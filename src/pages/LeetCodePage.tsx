import { useState } from 'react'
import { useParams } from '@tanstack/react-router'
import { SeoHead } from '@/components/SeoHead'
import { ExternalLink } from 'lucide-react'
import { useLeetCodeDetail, useLeetCodeHeatmap } from '../hooks/usePlatform'
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

const TREND_ARROW = { UP: '↑', DOWN: '↓', SAME: '→' } as const
const ACCENT = PLATFORM_ACCENT.leetcode

const HEATMAP_VIEWS = [
  { value: 'last_365', label: '365D' },
  { value: 'year', label: 'Year' },
] as const

export function LeetCodePage() {
  const { username } = useParams({ from: '/leetcode/$username' })
  const [heatmapView, setHeatmapView] = useState<'all' | 'last_365' | 'year'>('last_365')
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())



  const { data, isLoading, error } = useLeetCodeDetail(username)
  const { data: heatmapData } = useLeetCodeHeatmap(username, {
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
      <SeoHead title={`${username} | LeetCode Profile`} url={`https://codetrace.xyz/leetcode/${username}`} />
      <div className="mx-auto max-w-5xl px-4 py-8">
        <AppHeader />
        <div className="mt-6"><DetailSkeleton /></div>
      </div>
    </>
  )

  if (error || !data) return (
    <>
      <SeoHead title={`${username} | LeetCode Profile`} url={`https://codetrace.xyz/leetcode/${username}`} />
      <div className="mx-auto max-w-5xl px-4 py-8">
        <AppHeader />
        <ErrorBadge message={(error as Error)?.message ?? 'Failed to load LeetCode stats'} />
      </div>
    </>
  )

  const { contestInfo } = data

  const contestRatingHistory = contestInfo?.contestHistory
    ?.filter(c => c.attended)
    .map((c, i) => ({
      contestId: i,
      contestName: c.contest.title,
      rank: c.ranking,
      newRating: Math.round(c.rating),
      oldRating: i === 0 ? Math.round(c.rating) : Math.round(contestInfo.contestHistory.filter(x => x.attended)[i - 1]?.rating ?? c.rating),
    })) ?? []

  const heatmapCalendar = heatmapData
    ? Object.fromEntries(
        heatmapData.dailyContributions
          .filter(d => d.count > 0)
          .map(d => [String(d.timestamp), d.count])
      )
    : data.submissionCalendar

  const socialLinks = [
    { label: 'GitHub', url: data.githubUrl },
    { label: 'Twitter', url: data.twitterUrl },
    { label: 'LinkedIn', url: data.linkedinUrl },
    ...(data.profile?.websites ?? []).slice(0, 3).map((url, index) => ({ label: `Site ${index + 1}`, url })),
  ].filter(link => !!link.url)

  const submissionPanels = data.submitStats ? [
    { title: 'Accepted Runs', rows: data.submitStats.acSubmissionNum },
    { title: 'All Attempts', rows: data.submitStats.totalSubmissionNum },
  ] : []

  const heroBadges = (
    <>
      {contestInfo?.badge && (
        <Badge variant="outline" className="text-[10px] font-mono">{contestInfo.badge.name}</Badge>
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
        title={`${username} | LeetCode Profile`}
        description={`LeetCode stats for ${username}: problems solved, contest rating, and submission activity.`}
        url={`https://codetrace.xyz/leetcode/${username}`}
      />
      <div className="mx-auto max-w-5xl px-4 py-8">
      <AppHeader />

      <PageHero
        platform="leetcode"
        title={username}
        subtitle={data.profile?.realName && data.profile.realName !== username ? data.profile.realName : undefined}
        avatarSrc={data.profile?.userAvatar}
        avatarFallback={username}
        badges={heroBadges}
        stats={[
          { value: data.totalSolved, label: 'Total Solved' },
          { value: data.ranking, label: 'Global Rank' },
        ]}
      />

      <SectionGroup>
        <Section title="Overview" accent={ACCENT}>
          <StatBand
            accent={ACCENT}
            stats={[
              { value: data.totalSolved, label: 'Problems Solved' },
              { value: data.ranking, label: 'Global Ranking' },
              {
                custom: (
                  <div className="flex flex-col gap-1.5">
                    <span className="font-serif text-3xl font-light leading-none text-primary">{data.acceptanceRate.toFixed(1)}%</span>
                    <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">Acceptance Rate</span>
                  </div>
                ),
              },
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

        {(data.profile || data.contributions || socialLinks.length > 0) && (
          <Section title="Profile Signal" accent={ACCENT}>
            <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="pt-1">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-mono text-foreground">Identity & links</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {data.profile?.birthday ? `Born ${formatDisplayDate(data.profile.birthday, { month: 'short', day: 'numeric' })}` : 'Profile metadata from the live API'}
                    </div>
                  </div>
                  {data.activeBadge && (
                    <Badge variant="outline" className="border-primary/30 text-primary">{data.activeBadge.displayName}</Badge>
                  )}
                </div>

                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                  {data.profile?.aboutMe?.trim() || 'No profile bio published yet. The API now returns socials, contribution counters, and badge state, so this page can finally surface more than just the solve counts.'}
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
                  { label: 'Points', value: data.contributions?.points ?? 0 },
                  { label: 'Questions', value: data.contributions?.questionCount ?? 0 },
                  { label: 'Testcases', value: data.contributions?.testcaseCount ?? 0 },
                  { label: 'Websites', value: data.profile?.websites.length ?? 0 },
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

        {heatmapData ? (
          <div className="flex flex-col gap-3">
            <ActivityFilterBar
              title="Activity Lens"
              description="The heatmap endpoint now supports archive, trailing-year, and explicit-year windows. Switch windows to replay how your LeetCode practice changed over time."
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
              leetcodeHeatmap={heatmapData}
              startDate={heatmapData.startDate || undefined}
              endDate={heatmapData.endDate || undefined}
              periodLabel={heatmapPeriodLabel}
            />
          </div>
        ) : Object.keys(heatmapCalendar).length > 0 ? (
          <UniversalHeatmap calendar={heatmapCalendar} />
        ) : null}

        {submissionPanels.length > 0 && (
          <Section title="Submission Pulse" accent={ACCENT}>
            <div className="grid gap-5 md:grid-cols-2">
              {submissionPanels.map(panel => (
                <div key={panel.title} className="tile flex flex-col gap-3 px-4 py-4">
                  <div className="text-sm font-mono text-foreground">{panel.title}</div>
                  <div className="space-y-2">
                    {panel.rows.map(row => (
                      <div key={`${panel.title}-${row.difficulty}`} className="flex items-center justify-between gap-3 border-b border-border/40 py-2 last:border-b-0">
                        <div>
                          <div className="text-xs font-mono text-foreground">{row.difficulty}</div>
                          <div className="text-[10px] text-muted-foreground">{row.count} buckets</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-mono text-primary tnum">{row.submissions}</div>
                          <div className="text-[10px] text-muted-foreground">submissions</div>
                        </div>
                      </div>
                    ))}
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
                  const delta = i < contestInfo.contestHistory.filter(x => x.attended).length - 1
                    ? Math.round(c.rating - (contestInfo.contestHistory.filter(x => x.attended).slice(-20).reverse()[i+1]?.rating ?? c.rating))
                    : null
                  return (
                    <TableRow key={c.contest.title + c.contest.startTime}>
                      <TableCell className="max-w-[200px] truncate font-mono text-foreground">{c.contest.title}</TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground tnum">{c.ranking.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground tnum">{c.problemsSolved}/{c.totalProblems}</TableCell>
                      <TableCell className="text-right font-mono">
                        <span className="text-foreground tnum">{Math.round(c.rating)}</span>
                        {delta !== null && (
                          <span className="ml-1.5 tnum" style={{ color: delta >= 0 ? '#2db55d' : '#ef4444' }}>
                            {TREND_ARROW[c.trendDirection]}{Math.abs(delta)}
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
          <Section title="Recent Submissions" accent={ACCENT}>
            <Table className="editorial-table">
              <TableHeader>
                <TableRow>
                  <TableHead className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Problem</TableHead>
                  <TableHead className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Status</TableHead>
                  <TableHead className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Language</TableHead>
                  <TableHead className="text-right font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentSubmissions.slice(0, 8).map(submission => (
                  <TableRow key={`${submission.titleSlug}-${submission.timestamp}`}>
                    <TableCell className="font-mono text-foreground">{submission.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">{submission.statusDisplay}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-muted-foreground">{submission.lang}</TableCell>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground">
                      {new Date(submission.timestamp * 1000).toLocaleString('en', {
                        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                      })}
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
              iconBase="https://leetcode.com"
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
