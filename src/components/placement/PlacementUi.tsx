import type { ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { PlacementErrorAlert, PlacementLoadingBlock } from '@/components/placement/PlacementStates'

export function formatEnumLabel(value: string | null | undefined) {
  return String(value ?? '')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

export function PlacementPageStack({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('space-y-6', className)}>{children}</div>
}

export function PlacementAlerts({
  error,
  success,
  className,
}: {
  error?: string | null
  success?: string | null
  className?: string
}) {
  if (!error && !success) return null
  return (
    <div className={cn('space-y-3', className)}>
      {error ? <PlacementErrorAlert message={error} /> : null}
      {success ? (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 font-mono text-sm text-emerald-300">
          {success}
        </div>
      ) : null}
    </div>
  )
}

export function PlacementFilterCard({
  title = 'Filters',
  children,
  actions,
  className,
}: {
  title?: string
  children: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <Card className={cn('term-window border-border bg-card/80', className)}>
      <CardHeader className="border-b border-border pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold text-foreground">{title}</CardTitle>
          {actions}
        </div>
      </CardHeader>
      <CardContent className="pt-4">{children}</CardContent>
    </Card>
  )
}

export function PlacementSectionCard({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: ReactNode
  description?: string
  actions?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <Card className={cn('term-window border-border bg-card/80', className)}>
      <CardHeader className="border-b border-border">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
          </div>
          {actions}
        </div>
      </CardHeader>
      <CardContent className="pt-4">{children}</CardContent>
    </Card>
  )
}

export function PlacementTableCard({
  title,
  count,
  children,
  footer,
  className,
}: {
  title: string
  count?: number | string
  children: ReactNode
  footer?: ReactNode
  className?: string
}) {
  return (
    <Card className={cn('overflow-hidden term-window border-border bg-card/80', className)}>
      {title ? (
        <CardHeader className="border-b border-border py-3">
          <CardTitle className="text-sm font-semibold text-foreground">
            {title}
            {count != null ? <span className="ml-2 font-mono text-xs font-normal text-muted-foreground">({count})</span> : null}
          </CardTitle>
        </CardHeader>
      ) : null}
      <div className="overflow-x-auto">{children}</div>
      {footer}
    </Card>
  )
}

export function PlacementField({
  label,
  hint,
  children,
  className,
}: {
  label: string
  hint?: string
  children: ReactNode
  className?: string
}) {
  return (
    <label className={cn('block text-sm', className)}>
      <span className="font-medium text-muted-foreground">{label}</span>
      {hint ? <span className="mt-0.5 block font-mono text-[10px] text-muted-foreground/80">{hint}</span> : null}
      <div className="mt-1.5">{children}</div>
    </label>
  )
}

export const placementControlClass =
  'h-8 w-full rounded-lg border border-border bg-card px-2.5 text-sm'

export function PlacementSelect({
  value,
  onChange,
  children,
  className,
  disabled,
}: {
  value: string
  onChange: (value: string) => void
  children: ReactNode
  className?: string
  disabled?: boolean
}) {
  return (
    <select
      className={cn(placementControlClass, 'term-window bg-card/80', className)}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    >
      {children}
    </select>
  )
}

export function PlacementPaginationBar({
  page,
  pages,
  onPrevious,
  onNext,
}: {
  page: number
  pages: number
  onPrevious: () => void
  onNext: () => void
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
      <button
        type="button"
        className="rounded-md border border-border px-3 py-1 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
        disabled={page <= 1}
        onClick={onPrevious}
      >
        Previous
      </button>
      <span className="font-mono text-xs text-muted-foreground">
        Page {page} of {pages || 1}
      </span>
      <button
        type="button"
        className="rounded-md border border-border px-3 py-1 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
        disabled={page >= pages}
        onClick={onNext}
      >
        Next
      </button>
    </div>
  )
}

export function PlacementComingSoon({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <Card className="term-window border-dashed border-border bg-card/60">
      <CardContent className="py-14 text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Coming soon</p>
        <h3 className="mt-3 font-pixel text-xl text-foreground">{title}</h3>
        <p className="mx-auto mt-2 max-w-lg font-mono text-sm leading-relaxed text-muted-foreground">{description}</p>
        {action ? <div className="mt-5">{action}</div> : null}
      </CardContent>
    </Card>
  )
}

export function PlacementPageBody({
  loading,
  loadingLabel,
  empty,
  children,
}: {
  loading?: boolean
  loadingLabel?: string
  empty?: ReactNode
  children: ReactNode
}) {
  if (loading) return <PlacementLoadingBlock label={loadingLabel} />
  if (empty) return empty
  return children
}
