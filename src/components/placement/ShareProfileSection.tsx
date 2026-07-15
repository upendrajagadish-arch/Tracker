import type { ReactNode } from 'react'

export function ShareProfileSection({
  number,
  title,
  description,
  children,
}: {
  number: string
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section className="overflow-hidden rounded-xl border-2 border-primary/25 bg-card shadow-sm">
      <div className="flex flex-wrap items-start gap-3 border-b border-border bg-primary/5 px-4 py-3 sm:px-5">
        <span className="rounded-md bg-primary px-2 py-1 font-mono text-xs font-semibold tracking-wide text-primary-foreground">
          #{number}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-pixel text-lg text-foreground sm:text-xl">{title}</h2>
          {description ? (
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{description}</p>
          ) : null}
        </div>
      </div>
      <div className="px-4 py-4 sm:px-5 sm:py-5">{children}</div>
    </section>
  )
}

export function ShareMetric({
  label,
  value,
  hint,
}: {
  label: string
  value: ReactNode
  hint?: string
}) {
  return (
    <div className="min-w-0 rounded-lg border border-border bg-background/70 px-3 py-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <div className="mt-1.5 break-words text-base font-semibold text-foreground sm:text-lg">{value}</div>
      {hint ? <p className="mt-1 break-words text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

export function ShareNotAvailable({ label = 'Not Available' }: { label?: string }) {
  return <p className="text-sm text-muted-foreground">{label}</p>
}
