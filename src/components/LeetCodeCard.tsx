import { useQuery } from '@tanstack/react-query'
import { fetchLeetCodeStats } from '../api/leetcode'
import { StatNumber } from './StatNumber'
import { DifficultyMeter } from './DifficultyMeter'
import { LoadingCard } from './LoadingCard'
import { ErrorBadge } from './ErrorBadge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { PLATFORM_ACCENT } from './platformMeta'

interface Props {
  username: string
}

export function LeetCodeCard({ username }: Props) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['leetcode', username],
    queryFn: () => fetchLeetCodeStats(username),
    enabled: !!username,
  })

  if (isLoading) return <LoadingCard />
  if (error || !data) return <ErrorBadge message={(error as Error)?.message ?? 'Failed to load LeetCode stats'} />

  return (
    <div className="flex flex-col gap-5 p-5">
      <div className="flex items-center gap-4">
        {data.profile?.userAvatar && (
          <Avatar size="lg" className="size-12 rounded-xl">
            <AvatarImage src={data.profile.userAvatar} alt={data.profile.realName || username} />
            <AvatarFallback className="rounded-xl">{username.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
        )}
        <div className="stat-band grid flex-1 grid-cols-2 gap-x-4 sm:gap-x-0">
          <div className="flex flex-col gap-1.5 sm:px-4 sm:first:pl-0 sm:last:pr-0">
            <StatNumber value={data.totalSolved} label="Solved" accent={PLATFORM_ACCENT.leetcode} enabled={!!data} />
          </div>
          <div className="flex flex-col gap-1.5 sm:px-4 sm:first:pl-0 sm:last:pr-0">
            <StatNumber value={data.ranking} label="Rank" enabled={!!data} />
          </div>
        </div>
      </div>

      <div className="flex gap-5 text-xs font-mono text-muted-foreground">
        <span>Acceptance: <span className="text-foreground tnum">{data.acceptanceRate.toFixed(1)}%</span></span>
        {data.profile?.countryName && (
          <span className="text-muted-foreground/60">{data.profile.countryName}</span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground/70">Difficulty Breakdown</span>
        <DifficultyMeter
          easySolved={data.easySolved}
          mediumSolved={data.mediumSolved}
          hardSolved={data.hardSolved}
          totalEasy={data.totalEasy}
          totalMedium={data.totalMedium}
          totalHard={data.totalHard}
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Easy', value: data.easySolved, color: '#2db55d' },
          { label: 'Medium', value: data.mediumSolved, color: '#ffa116' },
          { label: 'Hard', value: data.hardSolved, color: '#ef4444' },
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
