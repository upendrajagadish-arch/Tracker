import type { ComponentType } from 'react'
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
import { PublicLandingPage } from '@/pages/PublicLandingPage'
import { LoginPage } from '@/pages/LoginPage'
import { AccountPage } from '@/pages/AccountPage'
import { PublicProfilePage } from '@/pages/PublicProfilePage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { PublicStudentPerformancePage } from '@/pages/public/PublicStudentPerformancePage'
import { PublicLeaderboardPage } from '@/pages/public/PublicLeaderboardPage'
import { StudentUpdatePortalPage } from '@/pages/student/StudentUpdatePortalPage'
import { createPlacementRoutes } from '@/router/placementRoutes'
import { RequireAuth } from '@/components/RequireAuth'

function authenticated(Page: ComponentType) {
  return function AuthenticatedRoute() {
    return (
      <RequireAuth>
        <Page />
      </RequireAuth>
    )
  }
}

const AuthenticatedHomePage = authenticated(HomePage)
const AuthenticatedGitHubPage = authenticated(GitHubPage)
const AuthenticatedLeetCodePage = authenticated(LeetCodePage)
const AuthenticatedCodeforcesPage = authenticated(CodeforcesPage)
const AuthenticatedGFGPage = authenticated(GFGPage)
const AuthenticatedCodeChefPage = authenticated(CodeChefPage)
const AuthenticatedHackerRankPage = authenticated(HackerRankPage)
const AuthenticatedTUFPage = authenticated(TUFPage)
const AuthenticatedProfilePage = authenticated(ProfilePage)
const AuthenticatedAccountPage = authenticated(AccountPage)

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
  component: PublicLandingPage,
})

export const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/app',
  component: AuthenticatedHomePage,
})

export const githubRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/github/$username',
  component: AuthenticatedGitHubPage,
})

export const leetcodeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/leetcode/$username',
  component: AuthenticatedLeetCodePage,
})

export const codeforcesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/codeforces/$username',
  component: AuthenticatedCodeforcesPage,
})

export const gfgRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/gfg/$username',
  component: AuthenticatedGFGPage,
})

export const codechefRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/codechef/$username',
  component: AuthenticatedCodeChefPage,
})

export const hackerrankRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/hackerrank/$username',
  component: AuthenticatedHackerRankPage,
})

export const tufRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tuf/$username',
  component: AuthenticatedTUFPage,
})

export const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/profile',
  component: AuthenticatedProfilePage,
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
  component: AuthenticatedAccountPage,
  validateSearch: accountSearch,
})

// Legacy alias — the old onboarding URL now serves the full account page.
export const onboardingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/onboarding',
  component: AuthenticatedAccountPage,
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
