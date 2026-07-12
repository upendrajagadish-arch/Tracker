import { StatNumber } from './StatNumber'

interface BandStat {
  value?: number
  label?: string
  prefix?: string
  suffix?: string
  accent?: string
  /** Optional custom node rendered instead of a StatNumber (e.g. a percentage). */
  custom?: React.ReactNode
}

/** Joined editorial stat strip — a row of figures separated by hairline
 *  dividers instead of floating cards. Collapses to a 2-col grid on mobile. */
export function StatBand({ stats, accent }: { stats: BandStat[]; accent?: string }) {
  return (
    <div className="stat-band grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-flow-col sm:auto-cols-fr sm:gap-x-0">
      {stats.map((s, i) => (
        <div key={s.label ?? i} className="flex flex-col gap-1.5 py-1 sm:px-6 sm:first:pl-0 sm:last:pr-0">
          {s.custom ?? (s.value != null && s.label ? (
            <StatNumber
              value={s.value}
              label={s.label}
              prefix={s.prefix}
              suffix={s.suffix}
              accent={s.accent ?? accent}
            />
          ) : null)}
        </div>
      ))}
    </div>
  )
}
