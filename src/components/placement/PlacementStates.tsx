import type { ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export function PlacementStatCard({
  label,
  value,
  hint,
  className,
}: {
  label: string
  value: ReactNode
  hint?: string
  className?: string
}) {
  return (
    <Card className={cn('term-window border-border bg-card/80', className)}>
      <CardContent className="pt-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
        <p className="mt-1 font-pixel text-2xl text-foreground">{value ?? '—'}</p>
        {hint ? <p className="mt-1 font-mono text-[10px] text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  )
}

export function PlacementEmptyState({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <Card className="term-window border-dashed border-border bg-card/60">
      <CardContent className="py-12 text-center">
        <h3 className="font-pixel text-lg text-foreground">{title}</h3>
        {description ? <p className="mt-2 font-mono text-sm text-muted-foreground">{description}</p> : null}
        {action ? <div className="mt-4">{action}</div> : null}
      </CardContent>
    </Card>
  )
}

export function PlacementErrorAlert({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 font-mono text-sm text-destructive">
      {message}
    </div>
  )
}

export function PlacementLoadingBlock({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 font-mono text-sm text-muted-foreground">
      <div className="mb-3 size-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
      {label}
    </div>
  )
}
