import type { ReactNode } from 'react'
import { Trophy } from 'lucide-react'
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
    <Card className={cn(className)}>
      <CardContent className="pt-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.5px] text-secondary">{label}</p>
          <Trophy className="size-4 text-orange" strokeWidth={2} />
        </div>
        <p className="mt-2 font-heading text-3xl text-foreground">{value ?? '—'}</p>
        {hint ? <p className="mt-1.5 text-xs text-secondary">{hint}</p> : null}
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
    <Card>
      <CardContent className="py-14 text-center">
        <h3 className="font-heading text-xl text-foreground">{title}</h3>
        {description ? <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-secondary">{description}</p> : null}
        {action ? <div className="mt-5">{action}</div> : null}
      </CardContent>
    </Card>
  )
}

export function PlacementErrorAlert({ message }: { message: string }) {
  return (
    <div className="rounded-console border border-primary/40 bg-primary/10 px-4 py-3 text-sm font-semibold text-primary">
      {message}
    </div>
  )
}

export function PlacementLoadingBlock({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-sm font-semibold text-secondary">
      <div className="mb-3 size-8 animate-spin rounded-full border-2 border-console border-t-primary" />
      {label}
    </div>
  )
}
