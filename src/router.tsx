import { createRouter, createRoute, createRootRoute, Outlet } from '@tanstack/react-router'
import { NuqsAdapter } from 'nuqs/adapters/tanstack-router'
import { AppFrame } from '@/components/AppFrame'
import { HomePage } from '@/pages/HomePage'
import { GitHubPage } from '@/pages/GitHubPage'
import { LeetCodePage } from '@/pages/LeetCodePage'
import { CodeforcesPage } from '@/pages/CodeforcesPage'
import { GFGPage } from '@/pages/GFGPage'
import { CodeChefPage } from '@/pages/CodeChefPage'
import { HackerRankPage } from '@/pages/HackerRankPage'
import { TUFPage } from '@/pages/TUFPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { MarketPage } from '@/pages/MarketPage'
import { LoginPage } from '@/pages/LoginPage'
import { AccountPage } from '@/pages/AccountPage'
import { PublicProfilePage } from '@/pages/PublicProfilePage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { PublicStudentPerformancePage } from '@/pages/public/PublicStudentPerformancePage'
import { PublicLeaderboardPage } from '@/pages/public/PublicLeaderboardPage'
import { StudentUpdatePortalPage } from '@/pages/student/StudentUpdatePortalPage'
import { createPlacementRoutes } from '@/router/placementRoutes'

const rootRoute = createRootRoute({
  component: () => (
    <NuqsAdapter>
      <AppFrame>
        <Outlet />
      </AppFrame>
    </NuqsAdapter>
  ),
})

export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: MarketPage,
})

export const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/app',
  component: HomePage,
})

export const githubRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/github/$username',
  component: GitHubPage,
})

export const leetcodeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/leetcode/$username',
  component: LeetCodePage,
})

export const codeforcesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/codeforces/$username',
  component: CodeforcesPage,
})

export const gfgRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/gfg/$username',
  component: GFGPage,
})

export const codechefRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/codechef/$username',
  component: CodeChefPage,
})

export const hackerrankRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/hackerrank/$username',
  component: HackerRankPage,
})

export const tufRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tuf/$username',
  component: TUFPage,
})

export const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/profile',
  component: ProfilePage,
})

export const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
  // Where to continue after a successful sign-in (e.g. /links).
  validateSearch: (search: Record<string, unknown>): { next?: string } => {
    const next = typeof search.next === 'string' && search.next.startsWith('/') ? search.next : undefined
    return next ? { next } : {}
  },
})

// Where to return after claiming a userid (e.g. the dashboard results the
// visitor was about to save — including its ?handles query string).
const accountSearch = (search: Record<string, unknown>): { next?: string } => {
  const next = typeof search.next === 'string' && search.next.startsWith('/') ? search.next : undefined
  return next ? { next } : {}
}

export const accountRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/account',
  component: AccountPage,
  validateSearch: accountSearch,
})

// Legacy alias — the old onboarding URL now serves the full account page.
export const onboardingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/onboarding',
  component: AccountPage,
  validateSearch: accountSearch,
})

export const publicStudentPerformanceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/public/student-performance/$token',
  component: PublicStudentPerformancePage,
})

export const publicLeaderboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/public/leaderboard',
  component: PublicLeaderboardPage,
})

export const studentUpdatePortalRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/student/update/$token',
  component: StudentUpdatePortalPage,
})

export const studentUpdateCampaignPortalRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/student/update/campaign/$campaignId',
  component: StudentUpdatePortalPage,
})

export const publicProfileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/$profileUsername',
  component: PublicProfilePage,
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  appRoute,
  loginRoute,
  accountRoute,
  onboardingRoute,
  githubRoute,
  leetcodeRoute,
  codeforcesRoute,
  gfgRoute,
  codechefRoute,
  hackerrankRoute,
  tufRoute,
  profileRoute,
  ...createPlacementRoutes(rootRoute),
  publicStudentPerformanceRoute,
  publicLeaderboardRoute,
  studentUpdatePortalRoute,
  studentUpdateCampaignPortalRoute,
  publicProfileRoute,
])

export const router = createRouter({
  routeTree,
  defaultNotFoundComponent: NotFoundPage,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
