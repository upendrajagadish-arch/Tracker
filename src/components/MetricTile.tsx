interface Props {
  value: React.ReactNode
  label: string
  sub?: string
  accent?: string
}

/** Quiet enclosed metric tile for 2×2 / n-col grids (career trajectory,
 *  profile signal, activity pulse). Serif figure, mono microlabel. */
export function MetricTile({ value, label, sub, accent }: Props) {
  return (
    <div className="tile flex flex-col gap-1.5 px-4 py-3.5">
      <span
        className="font-serif text-2xl font-light leading-none tracking-tight"
        style={{ color: accent ?? 'var(--color-foreground)' }}
      >
        {value}
      </span>
      <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </span>
      {sub && <span className="mt-0.5 font-mono text-[10px] text-muted-foreground/60">{sub}</span>}
    </div>
  )
}
