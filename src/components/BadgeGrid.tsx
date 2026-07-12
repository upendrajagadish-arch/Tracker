import { formatDisplayDate } from '@/lib/utils'

interface Badge {
  id: string | number
  name?: string
  displayName?: string
  icon?: string
  creationDate?: number | string | null
  grayscale?: boolean
}

interface Props {
  badges: Badge[]
  upcoming?: Badge[]
  active?: Badge & { displayName: string; icon?: string }
  /** Prefix for icon URLs (e.g. https://leetcode.com). */
  iconBase?: string
}

/** Editorial badge grid: an optional active badge highlight, an earned grid,
 *  and an upcoming grid. Each badge sits in a quiet tile with its icon,
 *  name, and date. */
export function BadgeGrid({ badges, upcoming = [], active, iconBase = '' }: Props) {
  if (badges.length === 0 && upcoming.length === 0 && !active) return null

  const cell = (b: Badge, dim = false) => {
    const label = b.displayName ?? b.name ?? 'Badge'
    return (
    <div
      key={b.id}
      className={`tile flex flex-col items-center gap-2 px-3 py-3.5 text-center ${dim ? 'opacity-50' : ''}`}
    >
      {b.icon ? (
        <img
          src={`${iconBase}${b.icon}`}
          alt={label}
          className={`size-10 object-contain ${dim ? 'grayscale' : ''}`}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
      ) : (
        <div className="grid size-10 place-items-center rounded-full border border-border bg-background text-xs font-mono text-primary">
          {label.slice(0, 1)}
        </div>
      )}
      <span className="text-[10px] leading-tight text-muted-foreground">{label}</span>
      {b.creationDate != null && b.creationDate !== 0 && (
        <span className="text-[9px] text-muted-foreground/60">
          {formatDisplayDate(b.creationDate, { month: 'short', year: 'numeric' })}
        </span>
      )}
    </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {active && (
        <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
          {active.icon ? (
            <img
              src={`${iconBase}${active.icon}`}
              alt={active.displayName}
              className="size-12 object-contain"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          ) : (
            <div className="grid size-12 place-items-center rounded-full border border-primary/20 bg-background text-sm font-mono text-primary">
              {active.displayName.slice(0, 1)}
            </div>
          )}
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-primary/80">Active Badge</span>
            <span className="text-sm font-mono text-foreground">{active.displayName}</span>
            <span className="text-[11px] text-muted-foreground">Currently featured on the profile</span>
          </div>
        </div>
      )}

      {badges.length > 0 && (
        <div className="flex flex-col gap-2.5">
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground/60">Earned</span>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
            {badges.map((b) => cell(b))}
          </div>
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="flex flex-col gap-2.5">
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground/60">Upcoming</span>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
            {upcoming.map((b) => cell(b, true))}
          </div>
        </div>
      )}
    </div>
  )
}
