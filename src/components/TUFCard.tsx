import { useQuery } from '@tanstack/react-query'
import { fetchCard } from '@/api/cards'
import { ErrorBadge } from './ErrorBadge'
import { LoadingCard } from './LoadingCard'
import { PLATFORM_ACCENT } from './platformMeta'
import { StatNumber } from './StatNumber'

interface Props {
  username: string
}

export function TUFCard({ username }: Props) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['tuf', username],
    queryFn: () => fetchCard('tuf', username),
    enabled: !!username,
  })

  if (isLoading) return <LoadingCard />
  if (error || !data) return <ErrorBadge message={(error as Error)?.message ?? 'Failed to load TUF stats'} />

  const easy = data.stats.byDifficulty.easy ?? 0
  const medium = data.stats.byDifficulty.medium ?? 0
  const hard = data.stats.byDifficulty.hard ?? 0

  return (
    <div className="flex flex-col gap-5 p-5">
      <div className="stat-band grid grid-cols-2 gap-x-4 sm:gap-x-0">
        <div className="flex flex-col gap-1.5 sm:px-4 sm:first:pl-0 sm:last:pr-0">
          <StatNumber value={data.stats.totalSolved} label="Solved" accent={PLATFORM_ACCENT.tuf} enabled />
        </div>
        <div className="flex flex-col gap-1.5 sm:px-4 sm:first:pl-0 sm:last:pr-0">
          <StatNumber value={data.stats.totalQuestions ?? 0} label="TUF DSA" enabled />
        </div>
      </div>

      <div className="flex gap-5 text-xs font-mono text-muted-foreground">
        <span>Active days: <span className="text-foreground tnum">{data.heatmap.totalActiveDays.toLocaleString()}</span></span>
        <span>Current streak: <span className="text-foreground tnum">{data.heatmap.currentStreak}</span></span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Easy', value: easy, color: '#2db55d' },
          { label: 'Medium', value: medium, color: '#ffa116' },
          { label: 'Hard', value: hard, color: '#ef4444' },
        ].map(({ label, value, color }) => (
          <div key={label} className="tile flex flex-col items-center gap-1 px-2 py-2.5">
            <span className="font-mono text-xl font-medium tnum" style={{ color }}>{value}</span>
            <span
              className="rounded-full border px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-[0.12em]"
              style={{ color, borderColor: `color-mix(in srgb, ${color} 30%, transparent)` }}
            >
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
