import { useId, type ReactNode } from 'react'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { PlacementErrorAlert, PlacementLoadingBlock } from '@/components/placement/PlacementStates'
import { SectionExportActions } from '@/components/placement/SectionExportActions'
import type { SectionExportTable } from '@/lib/analyticsExports'

export function formatEnumLabel(value: string | null | undefined) {
  return String(value ?? '')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

export function PlacementPageStack({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex flex-col gap-6', className)}>{children}</div>
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
        <div className="rounded-button border border-[#0ECB81]/30 bg-[#0ECB81]/10 px-4 py-3 text-[14px] font-semibold text-[#0ECB81]">
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
      <CardHeader className="border-b border-soft pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-[14px] font-bold">{title}</CardTitle>
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
      <CardHeader className="border-b border-soft">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>{title}</CardTitle>
            {description ? <p className="mt-1.5 text-[14px] leading-relaxed text-secondary">{description}</p> : null}
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
  exportSection,
}: {
  title: string
  count?: number | string
  children: ReactNode
  footer?: ReactNode
  className?: string
  exportSection?: SectionExportTable
}) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      {title ? (
        <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-soft py-3">
          <CardTitle className="text-[14px] font-bold">
            {title}
            {count != null ? <span className="ml-2 text-[12px] font-medium text-muted">({count})</span> : null}
          </CardTitle>
          {exportSection ? <SectionExportActions section={exportSection} size="xs" /> : null}
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
    <label className={cn('block text-[14px]', className)}>
      <span className="font-semibold text-foreground">{label}</span>
      {hint ? <span className="mt-1 block text-[12px] text-muted">{hint}</span> : null}
      <div className="mt-2">{children}</div>
    </label>
  )
}

export const placementControlClass =
  'h-10 w-full rounded-input border border-soft bg-[#0B0E11] px-3 text-[14px] font-medium outline-none transition-colors duration-150 focus-visible:border-[#3B82F6] focus-visible:ring-2 focus-visible:ring-[#3B82F6]/35'

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

/** Pick an existing company from the list or type a new company name. */
export function CompanyNameCombo({
  companies,
  companyId,
  companyName,
  onChange,
  placeholder = 'Select or type company name',
  className,
  disabled,
}: {
  companies: Array<{ id: string; name: string }>
  companyId: string
  companyName: string
  onChange: (next: { companyId: string; companyName: string }) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}) {
  const listId = useId()
  const selected = companyId ? companies.find((company) => company.id === companyId) : null
  const displayValue = selected?.name ?? companyName

  return (
    <>
      <Input
        list={listId}
        className={className}
        disabled={disabled}
        value={displayValue}
        placeholder={placeholder}
        onChange={(event) => {
          const text = event.target.value
          const match = companies.find(
            (company) => company.name.toLowerCase() === text.trim().toLowerCase(),
          )
          if (match) onChange({ companyId: match.id, companyName: match.name })
          else onChange({ companyId: '', companyName: text })
        }}
      />
      <datalist id={listId}>
        {companies.map((company) => (
          <option key={company.id} value={company.name} />
        ))}
      </datalist>
    </>
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
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-soft px-6 py-3">
      <button
        type="button"
        className="rounded-button border border-soft bg-elevated px-3 py-1.5 text-[12px] font-semibold text-secondary transition-colors hover:text-foreground disabled:opacity-35"
        disabled={page <= 1}
        onClick={onPrevious}
      >
        Previous
      </button>
      <span className="tnum text-[12px] text-muted">
        Page {page} of {pages || 1}
      </span>
      <button
        type="button"
        className="rounded-button border border-soft bg-elevated px-3 py-1.5 text-[12px] font-semibold text-secondary transition-colors hover:text-foreground disabled:opacity-35"
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
      <CardContent className="py-16 text-center">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-muted">Coming soon</p>
        <h3 className="mt-2 font-heading text-[24px] font-bold text-foreground">{title}</h3>
        <p className="mx-auto mt-2 max-w-lg text-[14px] leading-relaxed text-secondary">{description}</p>
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
