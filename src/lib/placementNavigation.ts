import {
  canExportReports,
  canExportResumeBooks,
  canManageCompanies,
  canRunMatching,
  canViewTechStack,
  canViewReports,
  canViewStudents,
  getPlacementPrefix,
  hasPermission,
  type PlacementRole,
} from '@/lib/placementPermissions'

export interface PlacementNavLink {
  to: string
  label: string
  /** When true, only highlight on an exact path match (used for dashboard). */
  exact?: boolean
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
  const prefix = getPlacementPrefix(role)
  if (prefix) return prefix
  if (role === 'interviewer') return '/interviewer'
  return null
}

export function getPlacementBasePath(role: PlacementRole | null | undefined): string | null {
  const prefix = getRolePrefix(role)
  if (!prefix) return null
  return `${prefix}/placement/students`
}

export function getPlacementNavLinks(role: PlacementRole | null | undefined): PlacementNavLink[] {
  if (!role || role === 'student') return []

  const prefix = getRolePrefix(role)
  if (!prefix) return []

  const base = `${prefix}/placement`
  const links: PlacementNavLink[] = []

  if (role === 'admin' || role === 'tpo' || role === 'faculty') {
    links.push({ to: `${base}`, label: 'Dashboard', exact: true })
  }

  if (role === 'admin' || role === 'tpo' || role === 'faculty' || role === 'interviewer') {
    links.push({ to: `${base}/operations`, label: 'Placement Operations' })
  }

  if (canViewStudents(role)) {
    links.push({
      to: `${base}/students`,
      label: role === 'interviewer' ? 'Students' : 'Student Tracker',
    })
  }

  if (hasPermission(role, 'campaigns:view') || role === 'admin' || role === 'tpo') {
    links.push({ to: `${base}/student-update-campaigns`, label: 'Student Update Campaigns' })
  }

  if (canViewTechStack(role)) {
    links.push({ to: `${base}/tech-stack`, label: 'Tech Stack' })
  }

  if (hasPermission(role, 'readiness:view') || role === 'admin' || role === 'tpo' || role === 'faculty') {
    links.push({ to: `${base}/communication`, label: 'Communication Evaluation' })
  }

  if (canViewReports(role)) {
    links.push({ to: `${base}/reports`, label: 'Analytics' })
  }

  return links
}

export function canManageStudents(role: PlacementRole | null | undefined) {
  return role === 'admin' || role === 'tpo'
}

export function canImportStudents(role: PlacementRole | null | undefined) {
  return hasPermission(role, 'students:import') || role === 'admin' || role === 'tpo'
}

export function canAssignStudentBranch(role: PlacementRole | null | undefined) {
  return hasPermission(role, 'students:update') || role === 'admin' || role === 'tpo'
}

export function canManageResumes(role: PlacementRole | null | undefined) {
  return role === 'admin' || role === 'tpo'
}

export function canManageReadiness(role: PlacementRole | null | undefined) {
  return role === 'admin' || role === 'tpo'
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
