import { useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { asPlacementPath } from '@/components/placement/PlacementLink'
import {
  BarChart3,
  BriefcaseBusiness,
  ChevronsLeft,
  ChevronsRight,
  GraduationCap,
  Home,
  LogOut,
  Megaphone,
  MessageSquareText,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { AppFooter } from '@/components/AppFooter'
import { PlacementTopBar } from '@/components/placement/PlacementTopBar'
import { WorkspaceTabs } from '@/components/placement/WorkspaceTabs'
import { useAuth } from '@/hooks/useAuth'
import { signOut } from '@/api/savedProfiles'
import { placementHomeForRole } from '@/lib/placementAuth'
import {
  getPlacementNavLinks,
  getRolePrefix,
  isPlacementHomePath,
  isPlacementNavActive,
  type PlacementNavIcon,
} from '@/lib/placementNavigation'
import { isStaffPlacementRole } from '@/lib/placementStaff'
import { isAllowedStaffLogin } from '@/lib/placementStaffLogins'
import { cn } from '@/lib/utils'

interface PlacementShellProps {
  title?: string
  children: ReactNode
  requireRole?: boolean
  headerShareUrl?: string | null
  headerShareTitle?: string
}

const SIDEBAR_KEY = 'codetrace-placement-sidebar-collapsed'

const NAV_ICONS: Record<PlacementNavIcon, LucideIcon> = {
  home: Home,
  students: Users,
  operations: BriefcaseBusiness,
  campaigns: Megaphone,
  tech: GraduationCap,
  communication: MessageSquareText,
  reports: BarChart3,
  logout: LogOut,
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
  title: _title,
  children,
  requireRole = true,
}: PlacementShellProps) {
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const { user, placementRole, placementLoading, isLoading, isConfigured, placementProfile } = useAuth()
  // Icon-only by default; expand on click (300ms).
  const [collapsed, setCollapsed] = useState(true)

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(SIDEBAR_KEY)
      if (stored === '0') setCollapsed(false)
      else setCollapsed(true)
    } catch {
      /* ignore */
    }
  }, [])

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        window.localStorage.setItem(SIDEBAR_KEY, next ? '1' : '0')
      } catch {
        /* ignore */
      }
      return next
    })
  }

  const navLinks = getPlacementNavLinks(placementRole)
  const homePath = placementHomeForRole(placementRole)
  const onHome = isPlacementHomePath(pathname, placementRole)

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
      <div className="flex min-h-screen flex-1 flex-col px-4 py-6 sm:px-6 md:px-8">
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
      <div className="placement-theme flex min-h-screen min-w-0 flex-1 flex-col overflow-x-clip bg-canvas">
        <div className="sticky top-0 z-50 w-full border-b border-soft bg-canvas/90 px-3 py-2 backdrop-blur-md sm:px-4 lg:px-5">
          <PlacementTopBar
            base={getRolePrefix(placementRole) ? `${getRolePrefix(placementRole)}/placement` : null}
          />
        </div>

        <div className="flex min-h-0 min-w-0 flex-1">
          <motion.aside
            initial={false}
            animate={{ width: collapsed ? 72 : 240 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              'placement-sidebar sticky top-[4.25rem] hidden h-[calc(100vh-4.25rem)] shrink-0 self-start overflow-hidden border-r border-soft p-3 lg:flex lg:flex-col',
              collapsed && 'is-collapsed',
            )}
          >
            <div className={cn('mb-4 flex items-center gap-2', collapsed ? 'justify-center' : 'justify-between px-2')}>
              <AnimatePresence initial={false} mode="wait">
                {!collapsed ? (
                  <motion.div
                    key="brand"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.3 }}
                    className="min-w-0"
                  >
                    <Link
                      to={asPlacementPath(homePath)}
                      className="block truncate font-heading text-[16px] font-bold text-foreground transition-colors hover:text-binance"
                    >
                      Placement
                    </Link>
                  </motion.div>
                ) : null}
              </AnimatePresence>
              <button
                type="button"
                onClick={toggleCollapsed}
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-xl border border-soft bg-elevated text-muted-foreground transition duration-300 hover:border-primary/40 hover:bg-primary/10 hover:text-binance"
                aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                aria-expanded={!collapsed}
              >
                {collapsed ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
              </button>
            </div>

            <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto overflow-x-hidden">
              {navLinks.map((link) => {
                const active = !link.external && isPlacementNavActive(pathname, link)
                const Icon = link.icon ? NAV_ICONS[link.icon] : Home
                const label = (
                  <span className={cn('placement-nav-label block truncate', collapsed && 'sr-only')}>
                    {link.label}
                  </span>
                )
                if (link.external) {
                  return (
                    <a
                      key={link.to}
                      href={link.to}
                      target="_blank"
                      rel="noreferrer"
                      title={link.label}
                      className={cn('placement-nav-link', collapsed && 'is-icon')}
                    >
                      <Icon className="placement-nav-icon" aria-hidden />
                      {label}
                    </a>
                  )
                }
                return (
                  <Link
                    key={link.to}
                    to={asPlacementPath(link.to)}
                    title={link.label}
                    className={cn('placement-nav-link', active && 'is-active', collapsed && 'is-icon')}
                  >
                    <Icon className="placement-nav-icon" aria-hidden />
                    {label}
                  </Link>
                )
              })}
            </nav>

            <button
              type="button"
              title="Logout"
              onClick={() => void handleSignOut()}
              className={cn('placement-nav-link mt-2', collapsed && 'is-icon')}
            >
              <LogOut className="placement-nav-icon" aria-hidden />
              <span className={cn('placement-nav-label block truncate', collapsed && 'sr-only')}>
                Logout
              </span>
            </button>
          </motion.aside>

          <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden">
            <div className="app-stack flex min-h-0 flex-1 flex-col px-3 py-3 sm:px-4 sm:py-4 lg:px-5 lg:py-4">
              <div className="flex max-w-full gap-2 overflow-x-auto rounded-card border border-soft bg-card/80 p-2 backdrop-blur lg:hidden">
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

              {!onHome ? <WorkspaceTabs active="placement" syncYear /> : null}

              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18 }}
                className="app-stack flex min-h-0 min-w-0 flex-1 flex-col"
              >
                {children}
              </motion.div>

              <div className="mt-auto border-t border-soft pt-4">
                <AppFooter className="mt-0 border-0 pt-0" />
              </div>
            </div>
          </main>
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
