import { Link, useRouterState } from '@tanstack/react-router'
import { asPlacementPath } from '@/components/placement/PlacementLink'
import { usePlacementPaths } from '@/components/placement/PlacementShell'
import { canManageStudentTechStack, canViewTechStack } from '@/lib/placementPermissions'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

export function TechStackModuleNav() {
  const { base } = usePlacementPaths()
  const { placementRole } = useAuth()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const canView = canViewTechStack(placementRole)
  const canEvaluate = canManageStudentTechStack(placementRole)

  if (!base || !canView) return null

  const links = [
    { to: `${base}/tech-stack`, label: 'Dashboard', exact: true },
    { to: `${base}/tech-stack/students`, label: 'Students' },
    ...(canEvaluate
      ? [
          { to: `${base}/tech-stack/evaluate`, label: 'Evaluate' },
          { to: `${base}/tech-stack/import`, label: 'Bulk Upload' },
        ]
      : []),
  ]

  return (
    <div className="mb-4 flex w-full max-w-full gap-1 overflow-x-auto rounded-card border border-soft bg-elevated p-1">
      {links.map((link) => {
        const normalizedPath = pathname.replace(/\/$/, '')
        const normalizedTarget = link.to.replace(/\/$/, '')
        const active = link.exact
          ? normalizedPath === normalizedTarget
          : normalizedPath === normalizedTarget || normalizedPath.startsWith(`${normalizedTarget}/`)
        return (
          <Link
            key={link.to}
            to={asPlacementPath(link.to)}
            className={cn(
              'shrink-0 rounded-md px-3 py-2 text-[13px] font-semibold transition-colors',
              active ? 'bg-card text-binance' : 'text-secondary hover:text-foreground',
            )}
          >
            {link.label}
          </Link>
        )
      })}
    </div>
  )
}
