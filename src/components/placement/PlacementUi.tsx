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
        <div className="rounded-console border border-[#1f9b55]/40 bg-success/15 px-4 py-3 text-sm font-semibold text-[#1a7a45]">
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
    <Card className={cn(className)}>
      <CardHeader className="border-b border-console pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-sm">{title}</CardTitle>
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
    <Card className={cn(className)}>
      <CardHeader className="border-b border-console">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>{title}</CardTitle>
            {description ? <p className="mt-1.5 text-sm leading-relaxed text-secondary">{description}</p> : null}
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
    <Card className={cn('overflow-hidden', className)}>
      {title ? (
        <CardHeader className="border-b border-console py-3">
          <CardTitle className="text-sm">
            {title}
            {count != null ? <span className="ml-2 font-sans text-xs font-normal text-secondary">({count})</span> : null}
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
      <span className="font-semibold text-foreground">{label}</span>
      {hint ? <span className="mt-1 block text-xs text-secondary">{hint}</span> : null}
      <div className="mt-2">{children}</div>
    </label>
  )
}

export const placementControlClass =
  'h-11 w-full rounded-input border border-console bg-console px-4 text-sm shadow-[inset_0_1px_2px_rgba(33,36,46,0.08)] outline-none transition-all duration-150 focus-visible:border-primary focus-visible:shadow-[0_0_0_3px_rgba(230,0,18,0.2)]'

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
      className={cn(placementControlClass, className)}
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
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-console px-5 py-4">
      <button
        type="button"
        className="rounded-console border border-console bg-console px-4 py-2 text-[11px] font-bold uppercase tracking-[0.5px] text-secondary shadow-[0_2px_0_#4D5C9A] transition-transform duration-150 hover:-translate-y-0.5 disabled:opacity-40"
        disabled={page <= 1}
        onClick={onPrevious}
      >
        Previous
      </button>
      <span className="text-xs font-semibold text-secondary">
        Page {page} of {pages || 1}
      </span>
      <button
        type="button"
        className="rounded-console border border-console bg-console px-4 py-2 text-[11px] font-bold uppercase tracking-[0.5px] text-secondary shadow-[0_2px_0_#4D5C9A] transition-transform duration-150 hover:-translate-y-0.5 disabled:opacity-40"
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
    <Card>
      <CardContent className="py-14 text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.5px] text-secondary">Coming soon</p>
        <h3 className="mt-3 font-heading text-xl text-foreground">{title}</h3>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-secondary">{description}</p>
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
