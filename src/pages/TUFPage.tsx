import { useState } from 'react'
import { useParams } from '@tanstack/react-router'
import { SeoHead } from '@/components/SeoHead'
import { ExternalLink } from 'lucide-react'
import { useTUFDetail, useTUFHeatmap } from '../hooks/usePlatform'
import { UniversalHeatmap } from '../components/UniversalHeatmap'
import { ActivityFilterBar } from '../components/ActivityFilterBar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PlatformIcon } from '../components/PlatformIcon'
import { formatDisplayDate } from '@/lib/utils'
import { Section, SectionGroup } from '../components/Section'
import { PageHero } from '../components/PageHero'
import { AppHeader } from '../components/AppHeader'
import { AppFooter } from '../components/AppFooter'
import { PLATFORM_ACCENT } from '../components/platformMeta'
import { StatBand } from '../components/StatBand'
import { DetailSkeleton } from '../components/DetailSkeleton'

const ACCENT = PLATFORM_ACCENT.tuf

const DIFFICULTIES = [
  { key: 'easy' as const, color: '#2db55d', label: 'Easy' },
  { key: 'medium' as const, color: '#ffa116', label: 'Medium' },
  { key: 'hard' as const, color: '#ef4444', label: 'Hard' },
]

const HEATMAP_RANGES = [
  { value: 'last_365', label: '365D' },
  { value: 'year', label: 'Year' },
] as const

export function TUFPage() {
  const { username } = useParams({ from: '/tuf/$username' })
  const [heatmapRange, setHeatmapRange] = useState<'all' | 'last_365' | 'year'>('last_365')
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())



  const { data: card, isLoading, error } = useTUFDetail(username)
  const { data: heatmapData } = useTUFHeatmap(username, {
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

  if (isLoading) return (
    <>
      <SeoHead title={`${username} | takeUforward Profile`} url={`https://codetrace.xyz/tuf/${username}`} />
      <div className="mx-auto max-w-5xl px-4 py-8">
        <AppHeader />
        <div className="mt-6"><DetailSkeleton /></div>
      </div>
    </>
  )

  if (error || !card) return (
    <>
      <SeoHead title={`${username} | takeUforward Profile`} url={`https://codetrace.xyz/tuf/${username}`} />
      <div className="mx-auto max-w-5xl px-4 py-8 flex flex-col gap-6">
        <AppHeader />
        <Card>
          <CardContent>
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <PlatformIcon platform="tuf" className="size-12 text-[var(--platform-tuf)] opacity-20" />
              <h2 className="text-xl font-display font-bold text-foreground">takeUforward Stats Unavailable</h2>
              <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
                {(error as Error)?.message ?? 'The TUF API is currently unable to fetch stats for this profile.'}
              </p>
              <Button variant="link" size="sm" asChild className="text-primary mt-2">
                <a href={`https://takeuforward.org/profile/${username}`} target="_blank" rel="noreferrer">
                  View profile on takeUforward
                  <ExternalLink data-icon="inline-end" />
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )

  const { profile, stats } = card
  const easy = stats.byDifficulty.easy ?? 0
  const medium = stats.byDifficulty.medium ?? 0
  const hard = stats.byDifficulty.hard ?? 0
  const difficultyTotal = easy + medium + hard
  const difficultyCounts = { easy, medium, hard }
  const completion = stats.totalQuestions && stats.totalQuestions > 0
    ? Math.round((stats.totalSolved / stats.totalQuestions) * 100)
    : null

  const socialLinks = [
    { label: 'GitHub', url: profile.social.github },
    { label: 'Twitter', url: profile.social.twitter },
    { label: 'LinkedIn', url: profile.social.linkedin },
    ...profile.websites.slice(0, 3).map((url, index) => ({ label: `Site ${index + 1}`, url })),
  ].filter((link) => !!link.url)

  const heatmapCalendar: Record<string, number> = {}
  if (heatmapData?.heatmap) {
    for (const entry of heatmapData.heatmap) heatmapCalendar[entry.date] = entry.count
  }

  const heatmapPeriodLabel = heatmapRange === 'year'
    ? String(selectedYear)
    : heatmapRange === 'all'
      ? 'all recorded activity'
      : 'the last 365 days'

  const subtitleParts = [profile.displayName, profile.institution].filter(Boolean)

  return (
    <>
      <SeoHead
        title={`${username} | takeUforward Profile`}
        description={`takeUforward DSA progress for ${username}: sheet completion, topic breakdown, and streak tracking.`}
        url={`https://codetrace.xyz/tuf/${username}`}
      />
      <div className="mx-auto max-w-5xl px-4 py-8">
      <AppHeader />

      <PageHero
        platform="tuf"
        title={username}
        subtitle={subtitleParts.length > 0 ? subtitleParts.join(' · ') : undefined}
        avatarSrc={profile.avatar ?? undefined}
        avatarFallback={profile.displayName ?? username}
        badges={completion != null && (
          <Badge variant="outline" className="border-primary/30 text-[10px] font-mono text-primary">
            {completion}% of TUF DSA
          </Badge>
        )}
        stats={[
          { value: stats.totalSolved, label: 'Solved' },
          ...(stats.totalQuestions ? [{ value: stats.totalQuestions, label: 'TUF DSA' }] : []),
        ]}
      />

      <SectionGroup>
        <Section title="DSA Progress" accent={ACCENT}>
          <StatBand
            accent={ACCENT}
            stats={[
              { value: stats.totalSolved, label: 'Solved' },
              ...(stats.totalQuestions ? [{ value: stats.totalQuestions, label: 'Total DSA' }] : []),
              ...(completion != null ? [{
                custom: (
                  <div className="flex flex-col gap-1.5">
                    <span className="font-serif text-3xl font-light leading-none text-primary">{completion}%</span>
                    <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">Completion</span>
                  </div>
                ),
              }] : []),
              { value: card.heatmap.totalActiveDays, label: 'Active Days' },
            ]}
          />

          {difficultyTotal > 0 && (
            <>
              <div className="grid grid-cols-3 gap-3">
                {DIFFICULTIES.map(({ key, color, label }) => (
                  <div key={key} className="tile flex flex-col items-center gap-2 px-2 py-4 text-center">
                    <span className="font-serif text-3xl font-light leading-none" style={{ color }}>
                      {difficultyCounts[key]}
                    </span>
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
                {DIFFICULTIES.filter((d) => difficultyCounts[d.key] > 0).map(({ key, color, label }) => {
                  const pct = (difficultyCounts[key] / difficultyTotal) * 100
                  return (
                    <div key={key} className="flex items-center gap-3">
                      <span className="w-14 flex-shrink-0 text-xs" style={{ color }}>{label}</span>
                      <div className="flex-1 h-2 rounded-full bg-border">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
                      </div>
                      <span className="w-8 text-right font-mono text-xs text-muted-foreground tnum">{difficultyCounts[key]}</span>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </Section>

        {(profile.displayName || profile.institution || socialLinks.length > 0) && (
          <Section title="Profile" accent={ACCENT}>
            {profile.institution && (
              <div className="flex items-center gap-2 text-sm font-mono text-muted-foreground">
                <span>Institution:</span>
                <span className="text-foreground">{profile.institution}</span>
              </div>
            )}
            {socialLinks.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {socialLinks.map((link) => (
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
          </Section>
        )}

        {stats.topicAnalysis.length > 0 && (
          <Section title="Topics" accent={ACCENT}>
            <div className="flex flex-wrap gap-2">
              {stats.topicAnalysis.map((topic) => (
                <span
                  key={topic.topic}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-3 py-1.5 text-[11px] font-mono text-muted-foreground"
                >
                  {topic.topic}
                  <span className="text-foreground tnum">{topic.count}</span>
                </span>
              ))}
            </div>
          </Section>
        )}

        {heatmapData && ((heatmapData.availableYears?.length ?? 0) > 0 || Object.keys(heatmapCalendar).length > 0) && (
          <div className="flex flex-col gap-3">
            <ActivityFilterBar
              title="Activity Lens"
              description="Replay how takeUforward practice changed over time — rolling-year and exact-year slices of the DSA streak heatmap."
              options={[...HEATMAP_RANGES]}
              value={heatmapRange}
              onValueChange={(value) => handleHeatmapRangeChange(value as 'all' | 'last_365' | 'year')}
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
              maxStreak={heatmapData.longestStreak}
              startDate={heatmapData.fromDate}
              endDate={heatmapData.toDate}
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
