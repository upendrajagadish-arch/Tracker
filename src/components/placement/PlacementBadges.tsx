import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export const PLACEMENT_STATUSES = [
  'NOT_STARTED',
  'IN_TRAINING',
  'READY',
  'SHORTLISTED',
  'PLACED',
  'NEEDS_ATTENTION',
] as const

export function formatPlacementStatus(status: string | null | undefined) {
  return String(status || 'NOT_STARTED').replace(/_/g, ' ')
}

export function formatEnumLabel(value: string | null | undefined) {
  return String(value ?? '')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

const REVIEW_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  approved: 'default',
  pending: 'outline',
  needs_revision: 'secondary',
  rejected: 'destructive',
}

export function ReviewStatusBadge({ status }: { status: string | null | undefined }) {
  const key = String(status ?? 'pending').toLowerCase()
  return (
    <Badge variant={REVIEW_VARIANT[key] ?? 'outline'} className="placement-badge font-mono text-[10px] capitalize">
      {formatEnumLabel(key)}
    </Badge>
  )
}

export function ModuleStatusBadge({ status }: { status: string | null | undefined }) {
  return (
    <Badge variant="outline" className="placement-badge font-mono text-[10px] capitalize">
      {formatEnumLabel(status)}
    </Badge>
  )
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  PLACED: 'default',
  READY: 'default',
  SHORTLISTED: 'secondary',
  IN_TRAINING: 'secondary',
  NEEDS_ATTENTION: 'destructive',
  NOT_STARTED: 'outline',
}

export function PlacementStatusBadge({ status }: { status: string | null | undefined }) {
  const key = status || 'NOT_STARTED'
  return (
    <Badge variant={STATUS_VARIANT[key] ?? 'outline'} className="placement-badge font-mono text-[10px] capitalize">
      {formatPlacementStatus(status)}
    </Badge>
  )
}

export function ReadinessStatusBadge({ status }: { status: string | null | undefined }) {
  const label = status ? status.replace(/_/g, ' ') : 'not ready'
  const tone =
    status === 'highly_ready' || status === 'placement_ready'
      ? 'border-primary/30 bg-primary/15 text-primary'
      : status === 'near_ready'
        ? 'border-[var(--term-amber)]/30 bg-[var(--term-amber)]/10 text-[var(--term-amber)]'
        : 'border-border bg-muted text-muted-foreground'
  return (
    <span className={cn('inline-flex rounded-md border px-2 py-0.5 font-mono text-[10px] capitalize', tone)}>
      {label}
    </span>
  )
}

export function CompletenessBar({ value }: { value: number | null | undefined }) {
  const v = Math.min(100, Math.max(0, Number(value) || 0))
  const color = v >= 70 ? 'bg-primary' : v >= 40 ? 'bg-[var(--term-amber)]' : 'bg-destructive'
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-20 overflow-hidden rounded-full bg-muted">
        <div className={cn('h-full transition-all', color)} style={{ width: `${v}%` }} />
      </div>
      <span className="font-mono text-[10px] text-muted-foreground">{v}%</span>
    </div>
  )
}
