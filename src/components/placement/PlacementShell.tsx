import type { ReactNode } from 'react'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { asPlacementPath } from '@/components/placement/PlacementLink'
import {
  LayoutDashboard,
  LogOut,
  Users,
  Building2,
  FileText,
  BarChart3,
  Settings,
  Trophy,
} from 'lucide-react'
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
import { isAllowedStaffLogin } from '@/lib/placementStaffLogins'
import { WorkspaceTabs } from '@/components/placement/WorkspaceTabs'
import { cn } from '@/lib/utils'
import { BRAND_NAME } from '@/lib/brand'

interface PlacementShellProps {
  title?: string
  children: ReactNode
  requireRole?: boolean
  headerShareUrl?: string | null
  headerShareTitle?: string
}

const NAV_ICONS = [LayoutDashboard, Users, Building2, FileText, BarChart3, Trophy, Settings]

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
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="panel-bevel rounded-dialog p-8 text-center md:p-10"
        >
          <h1 className="font-heading text-2xl text-foreground md:text-3xl">{title}</h1>
          <p className="mt-3 text-sm leading-relaxed text-secondary">{description}</p>
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
  headerShareUrl,
  headerShareTitle,
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
      <div className="px-4 py-10 md:px-8">
        <div className="mx-auto max-w-6xl space-y-4">
          <Skeleton className="h-14 w-full" />
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
    <div className="placement-theme flex min-h-screen flex-col">
      <div className="flex flex-1 px-4 py-8 md:px-8">
        <div className="mx-auto flex w-full max-w-6xl gap-6">
          <aside className="sticky top-4 hidden w-56 shrink-0 flex-col self-start overflow-hidden rounded-dialog border border-console bg-navigation shadow-console sm:flex lg:w-64">
            <div className="border-b border-white/10 px-4 py-4">
              <Link
                to={asPlacementPath(homePath)}
                className="font-heading text-base text-white transition-opacity hover:opacity-80"
              >
                Placement
              </Link>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.5px] text-white/45">
                Switch menu
              </p>
            </div>

            <div className="flex flex-1 flex-col px-2 py-3">
              <nav className="flex-1 space-y-1 overflow-y-auto">
                {navLinks.map((link, index) => {
                  const active = isPlacementNavActive(pathname, link)
                  const Icon = NAV_ICONS[index % NAV_ICONS.length]
                  return (
                    <Link
                      key={link.to}
                      to={asPlacementPath(link.to)}
                      className={cn('placement-nav-link flex items-center gap-2.5', active && 'is-active')}
                    >
                      <Icon className="size-4 shrink-0" strokeWidth={2} />
                      <span className="truncate">{link.label}</span>
                    </Link>
                  )
                })}
              </nav>

              <div className="mt-4 border-t border-white/10 px-2 pt-4">
                <p className="truncate px-2 text-sm font-semibold text-white">
                  {placementProfile?.full_name || user.email}
                </p>
                {placementRole ? (
                  <Badge className="mt-2 ml-2 border-white/20 bg-white/10 text-white capitalize">
                    {placementRole}
                  </Badge>
                ) : null}
                <div className="mt-3 flex flex-col gap-1.5 px-1">
                  <Button asChild variant="ghost" size="sm" className="justify-start text-white/80 hover:bg-white/10 hover:text-white">
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
            </div>
          </aside>

          <div className="min-w-0 flex-1">
            <AppHeader
              backTo="/app"
              backLabel="dashboard"
              shareUrl={headerShareUrl ?? null}
              shareTitle={headerShareTitle}
            />
            <WorkspaceTabs active="placement" />

            <div className="mb-4 flex gap-2 overflow-x-auto pb-1 sm:hidden">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={asPlacementPath(link.to)}
                  className={cn(
                    'shrink-0 rounded-console border px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.5px]',
                    isPlacementNavActive(pathname, link)
                      ? 'border-primary bg-primary text-white'
                      : 'border-console bg-panel text-secondary',
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {title ? (
              <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.5px] text-secondary">
                {title}
              </p>
            ) : null}

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              {children}
            </motion.div>
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
