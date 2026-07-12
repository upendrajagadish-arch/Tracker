import { useQuery } from '@tanstack/react-query'
import { fetchCodeChefStats } from '../api/codechef'
import { StatNumber } from './StatNumber'
import { RatingChart } from './RatingChart'
import { LoadingCard } from './LoadingCard'
import { ErrorBadge } from './ErrorBadge'
import { PLATFORM_ACCENT } from './platformMeta'
import type { RatingPoint } from '../types/api'

interface Props {
  username: string
}

export function CodeChefCard({ username }: Props) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['codechef', username],
    queryFn: () => fetchCodeChefStats(username),
  })

  if (isLoading) return <LoadingCard />
  if (error || !data) return <ErrorBadge message={(error as Error)?.message ?? 'Failed to load CodeChef data'} />

  const profile = data.profile

  const chronological = [...(data.contestHistory ?? [])]
    .filter(c => c.rating != null)
    .sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0))

  const ratingHistory: RatingPoint[] = chronological.map((c, i) => ({
    contestId: i,
    contestName: c.name ?? `Contest ${i + 1}`,
    rank: c.ranking ?? 0,
    ratingUpdateTimeSeconds: c.timestamp ?? undefined,
    oldRating: i === 0 ? Math.round(c.rating ?? 0) : Math.round(chronological[i - 1].rating ?? 0),
    newRating: Math.round(c.rating ?? 0),
  }))

  return (
    <div className="flex flex-col gap-5 p-5">
      <div className="flex items-center gap-3">
        {profile.profile && (
          <img src={profile.profile} alt="Avatar" className="size-10 rounded-full border border-border" />
        )}
        <div className="flex min-w-0 flex-col">
          <span className="truncate max-w-[200px] font-medium text-foreground">{profile.name || username}</span>
          <span className="font-mono text-xs text-muted-foreground">{profile.stars || 'Unrated'}</span>
        </div>
      </div>

      <div className="stat-band grid grid-cols-3 gap-x-4 sm:gap-x-0">
        <div className="flex flex-col gap-1.5 sm:px-4 sm:first:pl-0 sm:last:pr-0">
          <StatNumber value={profile.currentRating ?? 0} label="Current" accent={PLATFORM_ACCENT.codechef} />
        </div>
        <div className="flex flex-col gap-1.5 sm:px-4 sm:first:pl-0 sm:last:pr-0">
          <StatNumber value={profile.highestRating ?? 0} label="Peak" />
        </div>
        <div className="flex flex-col gap-1.5 sm:px-4 sm:first:pl-0 sm:last:pr-0">
          <StatNumber value={profile.totalSolved ?? 0} label="Solved" />
        </div>
      </div>

      {ratingHistory.length > 1 && (
        <div className="mt-auto flex flex-col gap-2">
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground/70">
            Rating · {ratingHistory.length} contests
          </span>
          <RatingChart history={ratingHistory} height={88} color={PLATFORM_ACCENT.codechef} />
        </div>
      )}
    </div>
  )
}
