import { useQuery } from '@tanstack/react-query'
import { fetchCodeforcesStats } from '../api/codeforces'
import { StatNumber } from './StatNumber'
import { RatingChart } from './RatingChart'
import { LoadingCard } from './LoadingCard'
import { ErrorBadge } from './ErrorBadge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { PLATFORM_ACCENT } from './platformMeta'

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

function rankColor(rank: string | null | undefined) {
  if (!rank) return 'var(--color-muted)'
  return RANK_COLORS[rank.toLowerCase()] ?? 'var(--color-muted)'
}

interface Props {
  username: string
}

export function CodeforcesCard({ username }: Props) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['codeforces', username],
    queryFn: () => fetchCodeforcesStats(username),
    enabled: !!username,
  })

  if (isLoading) return <LoadingCard />
  if (error || !data) return <ErrorBadge message={(error as Error)?.message ?? 'Failed to load Codeforces stats'} />

  const ratingHistory = data.rating_history ?? []

  return (
    <div className="flex flex-col gap-5 p-5">
      <div className="flex items-start gap-4">
        {data.avatar && (
          <Avatar className="size-12 shrink-0 rounded-xl">
            <AvatarImage src={data.avatar} alt={data.handle} />
            <AvatarFallback className="rounded-xl">{data.handle.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="font-serif text-2xl font-light leading-none tnum" style={{ color: PLATFORM_ACCENT.codeforces }}>
              {data.rating ?? '—'}
            </span>
            {data.rank && (
              <span
                className="rounded-full border px-2 py-0.5 text-[10px] font-mono"
                style={{ color: rankColor(data.rank), borderColor: `color-mix(in srgb, ${rankColor(data.rank)} 30%, transparent)` }}
              >
                {data.rank}
              </span>
            )}
          </div>
          <span className="font-mono text-xs text-muted-foreground">
            Max: <span className="text-foreground tnum">{data.maxRating ?? '—'}</span>{data.maxRank ? ` · ${data.maxRank}` : ''}
          </span>
        </div>
      </div>

      <div className="stat-band grid grid-cols-2 gap-x-4 sm:gap-x-0">
        <div className="flex flex-col gap-1.5 sm:px-4 sm:first:pl-0 sm:last:pr-0">
          <StatNumber value={data.solved_problems_count} label="Solved" enabled={!!data} />
        </div>
        <div className="flex flex-col gap-1.5 sm:px-4 sm:first:pl-0 sm:last:pr-0">
          <StatNumber value={data.contests_count} label="Contests" enabled={!!data} />
        </div>
      </div>

      {ratingHistory.length > 1 && (
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground/70">Rating History</span>
          <RatingChart history={ratingHistory} color={PLATFORM_ACCENT.codeforces} />
        </div>
      )}
    </div>
  )
}
