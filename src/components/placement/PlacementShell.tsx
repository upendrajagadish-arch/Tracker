import type { ReactNode } from 'react'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { asPlacementPath } from '@/components/placement/PlacementLink'
import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { AppFooter } from '@/components/AppFooter'
import { PlacementTopBar } from '@/components/placement/PlacementTopBar'
import { useAuth } from '@/hooks/useAuth'
import { signOut } from '@/api/savedProfiles'
import { placementHomeForRole } from '@/lib/placementAuth'
import { getPlacementNavLinks, getRolePrefix, isPlacementNavActive } from '@/lib/placementNavigation'
import { isStaffPlacementRole } from '@/lib/placementStaff'
import { isAllowedStaffLogin } from '@/lib/placementStaffLogins'
import { cn } from '@/lib/utils'
import { BRAND_NAME } from '@/lib/brand'

interface PlacementShellProps {
  title?: string
  children: ReactNode
  requireRole?: boolean
  headerShareUrl?: string | null
  headerShareTitle?: string
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
    <div className="flex flex-1 flex-col px-4 py-8 sm:px-6 md:px-8">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center">
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="rounded-card border border-soft bg-card p-8 text-center"
        >
          <h1 className="font-heading text-[24px] font-bold text-foreground">{title}</h1>
          <p className="mt-3 text-[14px] leading-relaxed text-secondary">{description}</p>
          <div className="mt-6">{action}</div>
        </motion.div>
      </div>
    </div>
  )
}

export function PlacementShell({
  title,
  children,
  requireRole = true,
}: PlacementShellProps) {
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
          <Button asChild variant="outline">
            <Link to="/app">Back to dashboard</Link>
          </Button>
        }
      />
    )
  }

  if (isLoading || placementLoading) {
    return (
      <div className="flex flex-1 flex-col px-4 py-6 sm:px-6 md:px-8">
        <div className="mx-auto w-full max-w-[1280px] space-y-4">
          <Skeleton className="h-12 w-full rounded-card" />
          <Skeleton className="h-10 w-full max-w-3xl rounded-card" />
          <Skeleton className="h-64 w-full rounded-card" />
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
          <Button asChild>
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
          <Button asChild variant="outline">
            <Link to="/app">Back to dashboard</Link>
          </Button>
        }
      />
    )
  }

  const staffEmail = placementProfile?.email || user.email || ''
  if (requireRole && !isAllowedStaffLogin(staffEmail)) {
    return (
      <PlacementMessageCard
        title="Unauthorized account"
        description="Only dedicated RCEE staff accounts can access the placement office."
        action={
          <Button variant="outline" onClick={() => void handleSignOut()}>
            Sign out
          </Button>
        }
      />
    )
  }

  return (
    <div className="placement-theme flex min-w-0 flex-1 flex-col overflow-x-clip">
      <div className="flex min-w-0 flex-1 px-3 py-4 sm:px-5 sm:py-5 xl:px-7">
        <div className="mx-auto flex min-w-0 w-full max-w-[1440px] gap-4 lg:gap-5">
          <aside className="sticky top-5 hidden w-56 shrink-0 self-start rounded-card border border-soft bg-card p-3 lg:flex lg:flex-col lg:top-6 lg:w-60">
            <Link
              to={asPlacementPath(homePath)}
              className="mb-4 px-2 font-heading text-[16px] font-bold text-foreground transition-colors hover:text-binance"
            >
              Placement
            </Link>

            <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
              Modules
            </p>

            <nav className="flex-1 space-y-0.5 overflow-y-auto">
              {navLinks.map((link) => {
                const active = !link.external && isPlacementNavActive(pathname, link)
                if (link.external) {
                  return (
                    <a
                      key={link.to}
                      href={link.to}
                      target="_blank"
                      rel="noreferrer"
                      className="placement-nav-link"
                    >
                      {link.label}
                    </a>
                  )
                }
                return (
                  <Link
                    key={link.to}
                    to={asPlacementPath(link.to)}
                    className={cn('placement-nav-link', active && 'is-active')}
                  >
                    {link.label}
                  </Link>
                )
              })}
            </nav>

            <div className="mt-4 border-t border-soft px-2 pt-4">
              <p className="truncate text-[13px] font-semibold text-foreground">
                {placementProfile?.full_name || user.email}
              </p>
              {placementRole ? (
                <Badge variant="secondary" className="mt-2 capitalize">
                  {placementRole}
                </Badge>
              ) : null}
              <div className="mt-3 flex flex-col gap-1">
                <Button asChild variant="ghost" size="sm" className="justify-start">
                  <Link to="/app">{BRAND_NAME} home</Link>
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="justify-start"
                  onClick={() => void handleSignOut()}
                >
                  <LogOut className="size-3.5" strokeWidth={2} />
                  Sign out
                </Button>
              </div>
            </div>
          </aside>

          <main className="app-stack min-w-0 max-w-full flex-1">
            <PlacementTopBar base={getRolePrefix(placementRole) ? `${getRolePrefix(placementRole)}/placement` : null} />

            <div className="flex max-w-full gap-2 overflow-x-auto rounded-card border border-soft bg-card p-2 lg:hidden">
              {navLinks.map((link) =>
                link.external ? (
                  <a
                    key={link.to}
                    href={link.to}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 rounded-button border border-soft px-3 py-1.5 text-[12px] font-semibold text-secondary"
                  >
                    {link.label}
                  </a>
                ) : (
                  <Link
                    key={link.to}
                    to={asPlacementPath(link.to)}
                    className={cn(
                      'shrink-0 rounded-button border px-3 py-1.5 text-[12px] font-semibold',
                      isPlacementNavActive(pathname, link)
                        ? 'border-primary/40 bg-primary/10 text-binance'
                        : 'border-soft text-secondary',
                    )}
                  >
                    {link.label}
                  </Link>
                ),
              )}
            </div>

            {title ? (
              <p className="text-[12px] font-semibold uppercase tracking-wide text-muted">
                {title}
              </p>
            ) : null}

            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18 }}
              className="app-stack"
            >
              {children}
            </motion.div>
          </main>
        </div>
      </div>
      <div className="border-t border-soft px-4 py-6 sm:px-6 md:px-8">
        <AppFooter className="mt-0 border-0 pt-0" />
      </div>
    </div>
  )
}

export function usePlacementPaths() {
  const { placementRole } = useAuth()
  const prefix = getRolePrefix(placementRole)
  const base = prefix ? `${prefix}/placement` : null
  return { prefix, base, role: placementRole }
}
