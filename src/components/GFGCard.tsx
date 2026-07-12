import { useQuery } from '@tanstack/react-query'
import { fetchGFGStats } from '../api/gfg'
import { StatNumber } from './StatNumber'
import { LoadingCard } from './LoadingCard'
import { ErrorBadge } from './ErrorBadge'
import { PLATFORM_ACCENT } from './platformMeta'

interface Props {
  username: string
}

const DIFFICULTIES = [
  { key: 'School' as const,  color: '#94a3b8' },
  { key: 'Basic' as const,   color: '#64ffda' },
  { key: 'Easy' as const,    color: '#2db55d' },
  { key: 'Medium' as const,  color: '#ffa116' },
  { key: 'Hard' as const,    color: '#ef4444' },
]

export function GFGCard({ username }: Props) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['gfg', username],
    queryFn: () => fetchGFGStats(username),
    enabled: !!username,
    retry: false,
  })

  if (isLoading) return <LoadingCard />
  if (error || !data) {
    return <ErrorBadge message={(error as Error)?.message ?? 'GFG stats currently unavailable'} />
  }

  return (
    <div className="flex flex-col gap-5 p-5">
      <StatNumber value={data.totalProblemsSolved} label="Total Solved" size="lg" accent={PLATFORM_ACCENT.gfg} enabled={!!data} />

      <div className="grid grid-cols-5 gap-2">
        {DIFFICULTIES.map(({ key, color }) => (
          <div key={key} className="tile flex flex-col items-center gap-1.5 px-1.5 py-3">
            <span className="font-mono text-lg font-medium tnum" style={{ color }}>{data[key]}</span>
            <span
              className="rounded-full border px-1.5 py-0.5 text-[9px] font-mono"
              style={{ color, borderColor: `color-mix(in srgb, ${color} 30%, transparent)` }}
            >
              {key}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
