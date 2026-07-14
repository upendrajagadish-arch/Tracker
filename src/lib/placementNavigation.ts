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

  if (canViewStudents(role)) {
    links.push({
      to: `${base}/students`,
      label: role === 'interviewer' ? 'Students' : 'Student Tracker',
    })
  }

  if (role === 'admin' || role === 'tpo') {
    links.push({ to: `${base}/resumes`, label: 'Resumes' })
  }

  if (canViewTechStack(role)) {
    links.push({ to: `${base}/tech-stack`, label: 'Tech Stack' })
  }

  if (hasPermission(role, 'readiness:view') || role === 'admin' || role === 'tpo') {
    links.push({ to: `${base}/readiness`, label: 'Readiness' })
  }

  if (hasPermission(role, 'readiness:view') || role === 'admin' || role === 'tpo' || role === 'faculty') {
    links.push({ to: `${base}/communication`, label: 'Communication Evaluation' })
  }

  if (hasPermission(role, 'readiness:view') || role === 'admin' || role === 'tpo' || role === 'faculty') {
    links.push({ to: `${base}/aptitude`, label: 'Aptitude' })
    links.push({ to: `${base}/verbal`, label: 'Verbal' })
    links.push({ to: `${base}/codenow`, label: 'CodeNow' })
  }

  if (role === 'admin' || role === 'tpo') {
    links.push({ to: `${base}/requirements`, label: 'Requirements' })
  }

  if (role === 'admin' || role === 'tpo' || role === 'faculty') {
    links.push({ to: `${base}/shared-students`, label: 'Shared Students' })
  }

  if (canExportResumeBooks(role) || (role === 'faculty' && canViewStudents(role))) {
    links.push({ to: `${base}/resume-books`, label: 'Resume Books' })
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
