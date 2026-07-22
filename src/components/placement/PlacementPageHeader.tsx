import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PlacementPageHeaderProps {
  /** Kept for call-site compatibility — not rendered (dashboard-style chrome). */
  title?: string
  /** Kept for call-site compatibility — not rendered. */
  description?: string
  actions?: ReactNode
  className?: string
}

/** Compact action row only — no page title / description (matches dashboard chrome). */
export function PlacementPageHeader({ actions, className }: PlacementPageHeaderProps) {
  if (!actions) return null
  return (
    <div
      className={cn(
        'flex w-full min-w-0 flex-wrap items-center justify-end gap-1.5 rounded-card border border-soft bg-elevated px-1.5 py-1',
        className,
      )}
    >
      {actions}
    </div>
  )
}
