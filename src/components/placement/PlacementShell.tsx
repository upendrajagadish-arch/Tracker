import type { ReactNode } from 'react'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { asPlacementPath } from '@/components/placement/PlacementLink'
import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { AppHeader } from '@/components/AppHeader'
import { AppFooter } from '@/components/AppFooter'
import { useAuth } from '@/hooks/useAuth'
import { signOut } from '@/api/savedProfiles'
import { placementHomeForRole } from '@/lib/placementAuth'
import { getPlacementNavLinks, getRolePrefix, isPlacementNavActive } from '@/lib/placementNavigation'
import { isStaffPlacementRole } from '@/lib/placementStaff'
import { WorkspaceTabs } from '@/components/placement/WorkspaceTabs'
import { cn } from '@/lib/utils'
import { BRAND_NAME } from '@/lib/brand'

interface PlacementShellProps {
  title?: string
  children: ReactNode
  requireRole?: boolean
}

function PlacementMessageCard({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action: ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col px-4 py-10 md:px-8">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center">
        <div className="term-window scanlines rise-in">
          <div className="term-bar">
            <span className="term-dot" style={{ background: 'var(--term-red)' }} />
            <span className="term-dot" style={{ background: 'var(--term-amber)' }} />
            <span className="term-dot" style={{ background: 'var(--term-green)' }} />
            <span className="ml-2 font-mono text-[11px] text-muted-foreground/80">~/placement — access</span>
          </div>
          <div className="crt-grid px-6 py-8 text-center md:px-9">
            <h1 className="glow-text font-pixel text-2xl text-foreground">{title}</h1>
            <p className="mt-3 font-mono text-sm leading-relaxed text-muted-foreground">{description}</p>
            <div className="mt-6">{action}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function PlacementShell({ title, children, requireRole = true }: PlacementShellProps) {
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const { user, placementRole, placementLoading, isLoading, isConfigured, placementProfile } = useAuth()

  const navLinks = getPlacementNavLinks(placementRole)
  const homePath = placementHomeForRole(placementRole)

  const handleSignOut = async () => {
    await signOut()
    navigate({ to: '/login' })
  }

  if (!isConfigured) {
    return (
      <PlacementMessageCard
        title="Placement unavailable"
        description="Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY."
        action={
          <Button asChild variant="outline" className="font-mono text-xs">
            <Link to="/app">Back to dashboard</Link>
          </Button>
        }
      />
    )
  }

  if (isLoading || placementLoading) {
    return (
      <div className="px-4 py-10 md:px-8">
        <div className="mx-auto max-w-6xl space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-10 w-full max-w-3xl" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <PlacementMessageCard
        title="Sign in required"
        description="Placement office tools require an authenticated account."
        action={
          <Button asChild className="font-mono text-xs">
            <Link to="/login" search={{ next: pathname }}>Sign in</Link>
          </Button>
        }
      />
    )
  }

  if (requireRole && (!placementRole || !isStaffPlacementRole(placementRole))) {
    return (
      <PlacementMessageCard
        title="No placement access"
        description="Your account does not have a placement role assigned yet."
        action={
          <Button asChild variant="outline" className="font-mono text-xs">
            <Link to="/app">Back to dashboard</Link>
          </Button>
        }
      />
    )
  }

  return (
    <div className="placement-theme flex min-h-screen flex-col">
      <div className="flex flex-1 px-4 py-8 md:px-8">
        <div className="mx-auto flex w-full max-w-6xl gap-6">
          <aside className="term-window scanlines hidden w-56 shrink-0 flex-col sm:flex lg:w-64">
            <div className="term-bar">
              <span className="term-dot" style={{ background: 'var(--term-red)' }} />
              <span className="term-dot" style={{ background: 'var(--term-amber)' }} />
              <span className="term-dot" style={{ background: 'var(--term-green)' }} />
              <Link to={asPlacementPath(homePath)} className="ml-1 truncate font-mono text-[10px] text-muted-foreground hover:text-primary">
                ~/placement
              </Link>
            </div>

            <div className="crt-grid flex flex-1 flex-col px-3 py-4">
              <p className="mb-1 font-pixel text-lg leading-none text-foreground">Placement</p>
              <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">office modules</p>

              <nav className="flex-1 space-y-0.5 overflow-y-auto">
                {navLinks.map((link) => {
                  const active = isPlacementNavActive(pathname, link)
                  return (
                    <Link
                      key={link.to}
                      to={asPlacementPath(link.to)}
                      className={cn(
                        'block rounded-md px-2.5 py-2 font-mono text-[11px] transition-colors',
                        active
                          ? 'bg-primary/15 text-primary shadow-[inset_2px_0_0_0_var(--color-primary)]'
                          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                      )}
                    >
                      {link.label.toLowerCase()}
                    </Link>
                  )
                })}
              </nav>

              <div className="mt-4 border-t border-border pt-4">
                <p className="truncate font-mono text-[11px] text-foreground">
                  {placementProfile?.full_name || user.email}
                </p>
                {placementRole ? (
                  <Badge variant="secondary" className="mt-1 font-mono text-[10px] capitalize">
                    {placementRole}
                  </Badge>
                ) : null}
                <div className="mt-3 flex flex-col gap-1.5">
                  <Button asChild variant="ghost" size="sm" className="h-7 justify-start px-2 font-mono text-[10px]">
                    <Link to="/app">{BRAND_NAME.toLowerCase()} home</Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 justify-start px-2 font-mono text-[10px]"
                    onClick={() => void handleSignOut()}
                  >
                    <LogOut className="size-3" />
                    sign out
                  </Button>
                </div>
              </div>
            </div>
          </aside>

          <div className="min-w-0 flex-1">
            <AppHeader backTo="/app" backLabel="dashboard" />
            <WorkspaceTabs active="placement" />

            <div className="mb-4 flex gap-2 overflow-x-auto pb-1 sm:hidden">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={asPlacementPath(link.to)}
                  className={cn(
                    'shrink-0 rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-wide',
                    isPlacementNavActive(pathname, link)
                      ? 'border-primary/40 bg-primary/15 text-primary'
                      : 'border-border text-muted-foreground',
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {title ? (
              <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                <span className="text-[var(--term-green)]">$</span> {title.toLowerCase()}
              </p>
            ) : null}

            <div className="rise-in">{children}</div>
          </div>
        </div>
      </div>
      <AppFooter />
    </div>
  )
}

export function usePlacementPaths() {
  const { placementRole } = useAuth()
  const prefix = getRolePrefix(placementRole)
  const base = prefix ? `${prefix}/placement` : null
  return { prefix, base, role: placementRole }
}
