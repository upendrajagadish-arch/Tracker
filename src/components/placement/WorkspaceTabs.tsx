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
    <div className="mb-4 flex gap-2 overflow-x-auto border-b border-border pb-2">
      <Link
        to={asPlacementPath(placementHome)}
        className={cn(
          'shrink-0 rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-wide transition-colors',
          active === 'placement'
            ? 'border-primary/40 bg-primary/15 text-primary'
            : 'border-border text-muted-foreground hover:text-foreground',
        )}
      >
        placement office
      </Link>
      <Link
        to="/app"
        className={cn(
          'shrink-0 rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-wide transition-colors',
          active === 'coding'
            ? 'border-primary/40 bg-primary/15 text-primary'
            : 'border-border text-muted-foreground hover:text-foreground',
        )}
      >
        coding platform
      </Link>
    </div>
  )
}
