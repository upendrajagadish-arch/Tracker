import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { asPlacementPath } from '@/components/placement/PlacementLink'
import { placementHomeForRole } from '@/lib/placementAuth'
import { useAuth } from '@/hooks/useAuth'
import { canUseWorkspaceTabs } from '@/lib/placementStaff'
import {
  PASS_OUT_YEAR_FILTERS,
  usePassOutYearFilter,
  type PassOutYearFilter,
} from '@/lib/placementYearFilter'
import { cn } from '@/lib/utils'

interface WorkspaceTabsProps {
  active: 'placement' | 'coding'
  year?: PassOutYearFilter
  onYearChange?: (year: PassOutYearFilter) => void
  trailing?: ReactNode
  /** When true, years come from the shared pass-out filter context. */
  syncYear?: boolean
}

export function WorkspaceTabs({
  active,
  year: yearProp,
  onYearChange: onYearChangeProp,
  trailing,
  syncYear = false,
}: WorkspaceTabsProps) {
  const { placementRole } = useAuth()
  const shared = usePassOutYearFilter()
  if (!canUseWorkspaceTabs(placementRole)) return null

  const year = syncYear ? shared.year : yearProp
  const onYearChange = syncYear ? shared.setYear : onYearChangeProp
  const placementHome = placementHomeForRole(placementRole)
  const showYears = Boolean(onYearChange && year)

  return (
    <div className="flex w-full flex-wrap items-center gap-x-3 gap-y-2 rounded-card border border-soft bg-elevated px-1 py-1">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        <div className="flex min-w-0 items-stretch">
          <Link
            to={asPlacementPath(placementHome)}
            className={cn(
              'relative shrink-0 px-3 py-2 text-[13px] font-semibold transition-colors',
              active === 'placement' ? 'text-binance' : 'text-secondary hover:text-foreground',
            )}
          >
            Placement office
            {active === 'placement' ? <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary" /> : null}
          </Link>
          <Link
            to="/app"
            className={cn(
              'relative shrink-0 border-l border-soft px-3 py-2 text-[13px] font-semibold transition-colors',
              active === 'coding' ? 'text-binance' : 'text-secondary hover:text-foreground',
            )}
          >
            Student Performance
            {active === 'coding' ? <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary" /> : null}
          </Link>
        </div>
        {trailing ? <div className="flex flex-wrap items-center gap-1.5">{trailing}</div> : null}
      </div>

      {showYears ? (
        <div
          className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-1.5 border-l border-soft pl-3"
          role="group"
          aria-label="Pass-out year"
        >
          {PASS_OUT_YEAR_FILTERS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onYearChange?.(option)}
              className={cn(
                'rounded-md px-2 py-1 text-[11px] font-semibold transition duration-200',
                year === option
                  ? 'bg-primary/15 text-binance ring-1 ring-primary/35'
                  : 'text-secondary hover:bg-card hover:text-foreground',
              )}
            >
              {option === 'all' ? 'All' : option}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
