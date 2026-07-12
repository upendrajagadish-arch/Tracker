import { useParams } from '@tanstack/react-router'
import { SeoHead } from '@/components/SeoHead'
import { ExternalLink, Star, GitFork } from 'lucide-react'
import { useGitHubDetail } from '../hooks/usePlatform'
import { LanguageBar } from '../components/LanguageBar'
import { UniversalHeatmap } from '../components/UniversalHeatmap'
import { ErrorBadge } from '../components/ErrorBadge'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Section, SectionGroup } from '../components/Section'
import { PageHero } from '../components/PageHero'
import { AppHeader } from '../components/AppHeader'
import { AppFooter } from '../components/AppFooter'
import { PLATFORM_ACCENT } from '../components/platformMeta'
import { StatBand } from '../components/StatBand'
import { DetailSkeleton } from '../components/DetailSkeleton'

const ACCENT = PLATFORM_ACCENT.github

export function GitHubPage() {
  const { username } = useParams({ from: '/github/$username' })

  const { data, isLoading, error } = useGitHubDetail(username)

  if (isLoading) return (
    <>
      <SeoHead title={`${username} | GitHub Profile`} url={`https://codetrace.xyz/github/${username}`} />
      <div className="mx-auto max-w-5xl px-4 py-8">
        <AppHeader />
        <div className="mt-6"><DetailSkeleton /></div>
      </div>
    </>
  )

  if (error || !data) return (
    <>
      <SeoHead title={`${username} | GitHub Profile`} url={`https://codetrace.xyz/github/${username}`} />
      <div className="mx-auto max-w-5xl px-4 py-8">
        <AppHeader />
        <ErrorBadge message={(error as Error)?.message ?? 'Failed to load GitHub stats'} />
      </div>
    </>
  )

  const { stats, pinned, stars, prs, orgContributions, profileViews, profile, heatmap, contributions } = data
  const heatmapCalendar = Object.fromEntries(
    heatmap.dailyContributions.map((day) => [day.date, day.count]),
  )

  const heroBadges = profileViews > 0 ? (
    <span className="text-[10px] font-mono text-muted-foreground">{profileViews} profile views</span>
  ) : undefined

  return (
    <>
      <SeoHead
        title={`${username} | GitHub Profile`}
        description={`GitHub stats for ${username}: repositories, contributions, stars, and more.`}
        url={`https://codetrace.xyz/github/${username}`}
      />
      <div className="mx-auto max-w-5xl px-4 py-8">
      <AppHeader />

      <PageHero
        platform="github"
        title={profile.displayName || username}
        subtitle={profile.displayName && profile.displayName !== username ? `@${username}` : undefined}
        avatarSrc={profile.avatar ?? `https://github.com/${username}.png`}
        avatarFallback={username}
        badges={heroBadges}
        stats={[
          { value: stats.totalCommits, label: 'Total Commits' },
          { value: stars.total_stars, label: 'Total Stars' },
        ]}
      />

      <SectionGroup>
        <Section title="Overview" accent={ACCENT}>
          <StatBand
            accent={ACCENT}
            stats={[
              { value: stats.currentStreak, label: 'Current Streak', suffix: 'd' },
              { value: stats.longestStreak, label: 'Longest Streak', suffix: 'd' },
              { value: stats.totalCommits, label: 'Total Commits' },
              { value: stars.total_stars, label: 'Stars Earned' },
            ]}
          />
        </Section>

        <Section title="Language Breakdown" accent={ACCENT}>
          <LanguageBar languages={stats.topLanguages} />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {stats.topLanguages.map(lang => (
              <div key={lang.name} className="tile flex items-center justify-between px-4 py-3">
                <span className="text-sm font-mono text-foreground">{lang.name}</span>
                <span className="text-sm font-mono text-primary tnum">{lang.percentage}%</span>
              </div>
            ))}
          </div>
        </Section>

        {contributions ? (
          <UniversalHeatmap githubContributions={contributions} label="contributions" />
        ) : heatmap.dailyContributions.length > 0 ? (
          <UniversalHeatmap
            calendar={heatmapCalendar}
            totalSubmissions={heatmap.totalSubmissions}
            activeDays={heatmap.totalActiveDays}
            maxStreak={heatmap.longestStreak}
            startDate={heatmap.firstActiveDate ?? undefined}
            endDate={heatmap.lastActiveDate ?? undefined}
            label="contributions"
            periodLabel="recorded activity"
          />
        ) : null}

        {pinned.length > 0 && (
          <Section title={`Pinned Repositories (${pinned.length})`} accent={ACCENT}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {pinned.map(repo => (
                <a
                  key={repo.name}
                  href={repo.url}
                  target="_blank"
                  rel="noreferrer"
                  className="link-quiet tile group flex flex-col gap-2 px-4 py-4 hover:border-primary/30"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-mono text-foreground transition-colors group-hover:text-primary">{repo.name}</span>
                    <ExternalLink className="size-3 text-muted-foreground" />
                  </div>
                  {repo.description && (
                    <p className="text-xs leading-relaxed text-muted-foreground line-clamp-2">{repo.description}</p>
                  )}
                  <div className="mt-auto flex items-center gap-4 pt-1 text-[11px] font-mono">
                    <span className="text-muted-foreground/60">{repo.primary_language}</span>
                    <span className="ml-auto flex items-center gap-0.5 text-muted-foreground/60">
                      <Star className="size-3" /> <span className="tnum">{repo.stars}</span>
                    </span>
                    <span className="flex items-center gap-0.5 text-muted-foreground/60">
                      <GitFork className="size-3" /> <span className="tnum">{repo.forks}</span>
                    </span>
                  </div>
                </a>
              ))}
            </div>
          </Section>
        )}

        {stars.repositories?.length > 0 && (
          <Section title="Top Starred Repositories" accent={ACCENT}>
            <Table className="editorial-table">
              <TableHeader>
                <TableRow>
                  <TableHead className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Repository</TableHead>
                  <TableHead className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Language</TableHead>
                  <TableHead className="text-right font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Stars</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stars.repositories.slice(0, 10).map(repo => (
                  <TableRow key={repo.name}>
                    <TableCell className="font-mono text-foreground">{repo.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{repo.language}</TableCell>
                    <TableCell className="text-right font-mono text-primary">
                      <span className="inline-flex items-center justify-end gap-1 tnum">
                        <Star className="size-3" /> {repo.stars}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Section>
        )}

        {prs.length > 0 && (
          <Section title={`Pull Requests (${prs.length})`} accent={ACCENT}>
            <div className="flex flex-col gap-2">
              {prs.slice(0, 10).map(pr => (
                <a
                  key={`${pr.repo}-${pr.number}`}
                  href={pr.url}
                  target="_blank"
                  rel="noreferrer"
                  className="link-quiet group flex items-start gap-3 border-b border-border/40 py-3 hover:border-primary/30"
                >
                  <Badge
                    variant={pr.merged_at ? 'default' : pr.state === 'open' ? 'outline' : 'destructive'}
                    className={`text-[10px] mt-0.5 flex-shrink-0 ${
                      pr.merged_at ? 'bg-purple-900/40 text-purple-300 border-purple-500/30' :
                      pr.state === 'open' ? 'bg-green-900/40 text-green-400 border-green-500/30' :
                      ''
                    }`}
                  >
                    {pr.merged_at ? 'merged' : pr.state}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-1 text-sm text-foreground transition-colors group-hover:text-primary">{pr.title}</div>
                    <div className="mt-0.5 font-mono text-[10px] text-muted-foreground/60">
                      {pr.repo} #{pr.number} · {new Date(pr.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </Section>
        )}

        {orgContributions.length > 0 && (
          <Section title={`Organization Contributions (${orgContributions.length})`} accent={ACCENT}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {orgContributions.slice(0, 8).map(org => (
                <a
                  key={org.org}
                  href={org.org_url}
                  target="_blank"
                  rel="noreferrer"
                  className="link-quiet tile group flex flex-col gap-2 px-4 py-3.5 hover:border-primary/30"
                >
                  <div className="flex items-center gap-2">
                    <Avatar size="sm">
                      <AvatarImage src={org.org_avatar_url} alt={org.org} />
                      <AvatarFallback>{org.org.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-mono text-foreground transition-colors group-hover:text-primary">@{org.org}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {org.repos.slice(0, 5).map(r => (
                      <Badge key={r} variant="outline" className="text-[10px] font-mono">{r}</Badge>
                    ))}
                    {org.repos.length > 5 && (
                      <span className="text-[10px] text-muted-foreground">+{org.repos.length - 5} more</span>
                    )}
                  </div>
                </a>
              ))}
            </div>
          </Section>
        )}
      </SectionGroup>

      <AppFooter />
    </div>
    </>
  )
}
