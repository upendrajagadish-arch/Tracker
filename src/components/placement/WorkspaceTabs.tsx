import { Link } from '@tanstack/react-router'
import { Gamepad2, LayoutGrid } from 'lucide-react'
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
    <div className="mb-5 inline-flex gap-1 rounded-console border border-console bg-panel-dark p-1 shadow-console">
      <Link
        to={asPlacementPath(placementHome)}
        className={cn(
          'inline-flex shrink-0 items-center gap-1.5 rounded-[10px] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.5px] transition-all duration-200',
          active === 'placement'
            ? 'bg-primary text-primary-foreground shadow-[0_2px_0_#9a000c]'
            : 'text-secondary hover:text-foreground',
        )}
      >
        <LayoutGrid className="size-3.5" strokeWidth={2} />
        Placement office
      </Link>
      <Link
        to="/app"
        className={cn(
          'inline-flex shrink-0 items-center gap-1.5 rounded-[10px] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.5px] transition-all duration-200',
          active === 'coding'
            ? 'bg-primary text-primary-foreground shadow-[0_2px_0_#9a000c]'
            : 'text-secondary hover:text-foreground',
        )}
      >
        <Gamepad2 className="size-3.5" strokeWidth={2} />
        Coding platform
      </Link>
    </div>
  )
}
