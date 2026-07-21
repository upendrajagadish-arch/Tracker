import { Link } from '@tanstack/react-router'
import { asPlacementPath } from '@/components/placement/PlacementLink'
import { placementHomeForRole } from '@/lib/placementAuth'
import { useAuth } from '@/hooks/useAuth'
import { canUseWorkspaceTabs } from '@/lib/placementStaff'
import { cn } from '@/lib/utils'

interface WorkspaceTabsProps {
  active: 'placement' | 'coding'
}

export function WorkspaceTabs({ active }: WorkspaceTabsProps) {
  const { placementRole } = useAuth()
  if (!canUseWorkspaceTabs(placementRole)) return null

  const placementHome = placementHomeForRole(placementRole)

  return (
    <div className="flex w-full rounded-card border border-soft bg-elevated">
      <Link
        to={asPlacementPath(placementHome)}
        className={cn(
          'relative shrink-0 px-4 py-2.5 text-[14px] font-semibold transition-colors',
          active === 'placement' ? 'text-binance' : 'text-secondary hover:text-foreground',
        )}
      >
        Placement office
        {active === 'placement' ? <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary" /> : null}
      </Link>
      <Link
        to="/app"
        className={cn(
          'relative shrink-0 border-l border-soft px-4 py-2.5 text-[14px] font-semibold transition-colors',
          active === 'coding' ? 'text-binance' : 'text-secondary hover:text-foreground',
        )}
      >
        Student Performance
        {active === 'coding' ? <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary" /> : null}
      </Link>
    </div>
  )
}
