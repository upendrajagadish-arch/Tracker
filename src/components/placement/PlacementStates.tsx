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
  const display =
    value === null || value === undefined || value === ''
      ? '—'
      : value
  return (
    <Card className={cn(className)}>
      <CardContent className="pt-1">
        <p className="text-[12px] font-semibold text-secondary">{label}</p>
        <p className="tnum mt-2 text-[28px] font-bold tracking-tight text-binance">{display}</p>
        {hint ? <p className="mt-1.5 text-[12px] text-muted">{hint}</p> : null}
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
      <CardContent className="py-16 text-center">
        <h3 className="font-heading text-[20px] font-bold text-foreground">{title}</h3>
        {description ? <p className="mx-auto mt-2 max-w-md text-[14px] leading-relaxed text-secondary">{description}</p> : null}
        {action ? <div className="mt-5">{action}</div> : null}
      </CardContent>
    </Card>
  )
}

export function PlacementErrorAlert({ message }: { message: string }) {
  return (
    <div className="rounded-button border border-[#F6465D]/35 bg-[#F6465D]/10 px-4 py-3 text-[14px] font-semibold text-[#F6465D]">
      {message}
    </div>
  )
}

export function PlacementLoadingBlock({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-[14px] text-secondary">
      <div className="mb-3 size-7 animate-spin rounded-full border-2 border-soft border-t-primary" />
      {label}
    </div>
  )
}
