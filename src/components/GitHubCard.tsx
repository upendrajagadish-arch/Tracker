import { useQuery } from '@tanstack/react-query'
import { fetchGitHubStats } from '../api/github'
import { StatNumber } from './StatNumber'
import { LanguageBar } from './LanguageBar'
import { PinnedRepos } from './PinnedRepos'
import { LoadingCard } from './LoadingCard'
import { ErrorBadge } from './ErrorBadge'
import { PLATFORM_ACCENT } from './platformMeta'

interface Props {
  username: string
}

export function GitHubCard({ username }: Props) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['github', username],
    queryFn: () => fetchGitHubStats(username),
    enabled: !!username,
  })

  if (isLoading) return <LoadingCard />
  if (error || !data) return <ErrorBadge message={(error as Error)?.message ?? 'Failed to load GitHub stats'} />

  const { stats, pinned, stars } = data

  return (
    <div className="flex flex-col gap-5 p-5">
      <div className="stat-band grid grid-cols-3 gap-x-4 gap-y-3 sm:gap-x-0">
        <div className="flex flex-col gap-1.5 sm:px-4 sm:first:pl-0 sm:last:pr-0">
          <StatNumber value={stats.totalCommits} label="Commits" accent={PLATFORM_ACCENT.github} enabled={!!data} />
        </div>
        <div className="flex flex-col gap-1.5 sm:px-4 sm:first:pl-0 sm:last:pr-0">
          <StatNumber value={stats.currentStreak} label="Streak" suffix="d" enabled={!!data} />
        </div>
        <div className="flex flex-col gap-1.5 sm:px-4 sm:first:pl-0 sm:last:pr-0">
          <StatNumber value={stars.total_stars} label="Stars" enabled={!!data} />
        </div>
      </div>

      <div className="flex gap-6 text-xs font-mono text-muted-foreground">
        <span>Longest streak: <span className="text-foreground tnum">{stats.longestStreak}d</span></span>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground/70">Languages</span>
        <LanguageBar languages={stats.topLanguages} />
      </div>

      {pinned.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground/70">Pinned</span>
          <PinnedRepos repos={pinned} />
        </div>
      )}
    </div>
  )
}
