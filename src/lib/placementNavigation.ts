import {
  canExportReports,
  canExportResumeBooks,
  canManageCompanies,
  canRunMatching,
  canViewTechStack,
  canViewStudents,
  getPlacementPrefix,
  hasPermission,
  type PlacementRole,
} from '@/lib/placementPermissions'

export type PlacementNavIcon =
  | 'home'
  | 'dashboard'
  | 'students'
  | 'operations'
  | 'campaigns'
  | 'tech'
  | 'communication'
  | 'reports'
  | 'logout'

export interface PlacementNavLink {
  to: string
  label: string
  icon?: PlacementNavIcon
  /** When true, only highlight on an exact path match (used for dashboard). */
  exact?: boolean
  /** Open as a public absolute path (e.g. Leaderboard). */
  external?: boolean
}

export function isPlacementNavActive(pathname: string, link: PlacementNavLink): boolean {
  const normalizedPath = pathname.replace(/\/$/, '')
  const normalizedTarget = link.to.replace(/\/$/, '')
  if (link.exact) {
    return normalizedPath === normalizedTarget
  }
  return normalizedPath === normalizedTarget || normalizedPath.startsWith(`${normalizedTarget}/`)
}

export function getRolePrefix(role: PlacementRole | null | undefined): string | null {
  return getPlacementPrefix(role)
}

export function getPlacementBasePath(role: PlacementRole | null | undefined): string | null {
  const prefix = getRolePrefix(role)
  if (!prefix) return null
  return `${prefix}/placement/students`
}

export function isPlacementHomePath(pathname: string, role: PlacementRole | null | undefined): boolean {
  const prefix = getRolePrefix(role)
  if (!prefix) return false
  const normalized = pathname.replace(/\/$/, '')
  const home = `${prefix}/placement`
  const dashboard = `${prefix}/placement/dashboard`
  return normalized === home || normalized === dashboard
}

export function getPlacementNavLinks(role: PlacementRole | null | undefined): PlacementNavLink[] {
  if (!role || role === 'student') return []

  const prefix = getRolePrefix(role)
  if (!prefix) return []

  const base = `${prefix}/placement`
  const links: PlacementNavLink[] = []

  // Faculty workspace: home (+ classic dashboard), tracker, tech/communication, campaigns.
  if (role === 'faculty') {
    links.push({ to: `${base}`, label: 'Home', icon: 'home', exact: true })
    links.push({ to: `${base}/dashboard`, label: 'Dashboard', icon: 'dashboard', exact: true })
    if (canViewStudents(role)) {
      links.push({ to: `${base}/students`, label: 'Students', icon: 'students' })
    }
    if (canViewTechStack(role)) {
      links.push({ to: `${base}/tech-stack`, label: 'Training', icon: 'tech' })
    }
    links.push({ to: `${base}/communication`, label: 'Performance', icon: 'communication' })
    if (hasPermission(role, 'campaigns:view')) {
      links.push({ to: `${base}/student-update-campaigns`, label: 'Campaigns', icon: 'campaigns' })
    }
    return links
  }

  if (role === 'interviewer') {
    links.push({ to: `${base}`, label: 'Home', icon: 'home', exact: true })
    links.push({ to: `${base}/operations`, label: 'Operations', icon: 'operations' })
    if (canViewStudents(role)) {
      links.push({ to: `${base}/students`, label: 'Students', icon: 'students' })
    }
    return links
  }

  if (role === 'admin' || role === 'tpo') {
    links.push({ to: `${base}`, label: 'Home', icon: 'home', exact: true })
    links.push({ to: `${base}/dashboard`, label: 'Dashboard', icon: 'dashboard', exact: true })
  }

  if (role === 'admin' || role === 'tpo') {
    links.push({ to: `${base}/operations`, label: 'Operations', icon: 'operations' })
  }

  if (canViewStudents(role)) {
    links.push({
      to: `${base}/students`,
      label: 'Students',
      icon: 'students',
    })
  }

  if (hasPermission(role, 'campaigns:view') || role === 'admin' || role === 'tpo') {
    links.push({ to: `${base}/student-update-campaigns`, label: 'Campaigns', icon: 'campaigns' })
  }

  if (canViewTechStack(role)) {
    links.push({ to: `${base}/tech-stack`, label: 'Training', icon: 'tech' })
  }

  if (hasPermission(role, 'readiness:view') || role === 'admin' || role === 'tpo') {
    links.push({ to: `${base}/communication`, label: 'Performance', icon: 'communication' })
  }

  if (canExportReports(role) || role === 'admin' || role === 'tpo') {
    links.push({ to: `${base}/reports`, label: 'Reports', icon: 'reports' })
  }

  return links
}

export function canManageStudents(role: PlacementRole | null | undefined) {
  return role === 'admin' || role === 'tpo'
}

export function canImportStudents(role: PlacementRole | null | undefined) {
  return hasPermission(role, 'students:import') || role === 'admin' || role === 'tpo' || role === 'faculty'
}

export function canAssignStudentBranch(role: PlacementRole | null | undefined) {
  return hasPermission(role, 'students:update') || role === 'admin' || role === 'tpo' || role === 'faculty'
}

export function canManageResumes(role: PlacementRole | null | undefined) {
  return role === 'admin' || role === 'tpo'
}

export function canManageReadiness(role: PlacementRole | null | undefined) {
  return role === 'admin' || role === 'tpo'
}

/** Communication Evaluate / Bulk Upload — Admin, TPO, Faculty. */
export function canEvaluateCommunication(role: PlacementRole | null | undefined) {
  return role === 'admin' || role === 'tpo' || role === 'faculty'
}

/** Communication Evaluation module (Dashboard / Students / Analytics). Admin, TPO, Faculty only. */
export function canViewCommunicationModule(role: PlacementRole | null | undefined) {
  return role === 'admin' || role === 'tpo' || role === 'faculty'
}

export function assertCanViewCommunicationModule(role: PlacementRole | null | undefined) {
  if (!canViewCommunicationModule(role)) {
    const err = new Error('403 Forbidden: Communication module access denied')
    err.name = 'ForbiddenError'
    throw err
  }
}

export function canViewCompanies(role: PlacementRole | null | undefined) {
  return hasPermission(role, 'students:view')
}

export {
  canExportReports,
  canExportResumeBooks,
  canManageCompanies,
  canRunMatching,
  canViewTechStack,
}
