import { useMemo } from 'react'
import { useProfileCards } from '../hooks/useCards'
import { StatNumber } from './StatNumber'
import { PLATFORM_ACCENT } from './platformMeta'
import type { Platform, Usernames } from '../types/api'

interface Props {
  usernames: Usernames
}

/** Editorial ledger strip over the unified cards. Stacked accounts on one
 *  platform combine: solve/commit counts add up, ratings take the strongest.
 *  Each figure is tinted with its platform accent. */
export function SummaryStrip({ usernames }: Props) {
  const { loaded } = useProfileCards(usernames)

  const stats = useMemo(() => {
    const sumBy = (platform: string) =>
      loaded.filter((c) => c.platform === platform).reduce((a, c) => a + c.stats.totalSolved, 0)
    const maxRating = (platform: string) =>
      Math.max(0, ...loaded.filter((c) => c.platform === platform).map((c) => Math.round(c.contests.rating ?? c.rating.current ?? 0)))
    const has = (platform: string) => loaded.some((c) => c.platform === platform)

    return [
      { value: sumBy('github'),     label: 'GitHub Commits',  platform: 'github' as Platform,     show: has('github') },
      { value: sumBy('leetcode'),   label: 'LeetCode Solved', platform: 'leetcode' as Platform,   show: has('leetcode') },
      { value: maxRating('codeforces'), label: 'CF Rating',   platform: 'codeforces' as Platform, show: has('codeforces') },
      { value: sumBy('gfg'),        label: 'GFG Solved',      platform: 'gfg' as Platform,        show: has('gfg') },
      { value: maxRating('codechef'), label: 'CC Rating',     platform: 'codechef' as Platform,   show: has('codechef') },
      { value: sumBy('hackerrank'), label: 'HR Solved',       platform: 'hackerrank' as Platform, show: has('hackerrank') },
      { value: sumBy('tuf'),        label: 'TUF Solved',      platform: 'tuf' as Platform,        show: has('tuf') },
    ].filter((s) => s.show)
  }, [loaded])

  if (!stats.length) return null

  return (
    <div className="fade-in mb-8 stat-band grid grid-cols-2 gap-x-8 gap-y-6 border-y border-border/60 py-6 sm:grid-flow-col sm:auto-cols-fr sm:gap-x-0">
      {stats.map((s) => (
        <div key={s.label} className="flex flex-col gap-1.5 sm:px-8 sm:first:pl-0 sm:last:pr-0">
          <StatNumber value={s.value} label={s.label} size="lg" accent={PLATFORM_ACCENT[s.platform]} />
        </div>
      ))}
    </div>
  )
}
