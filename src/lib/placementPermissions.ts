export type PlacementRole =
  | 'admin'
  | 'tpo'
  | 'faculty'
  | 'interviewer'
  | 'hr'
  | 'student'

export const ROLE_PERMISSIONS: Record<PlacementRole, string[]> = {
  admin: ['*'],
  tpo: [
    'students:view',
    'students:create',
    'students:update',
    'students:import',
    'students:export',
    'reports:view',
    'reports:export',
    'companies:view',
    'companies:manage',
    'matching:run',
    'readiness:view',
    'readiness:manage',
    'tech_stack:view',
    'tech_stack:manage',
    'tech_stack:master_manage',
    'tech_stack:verify',
    'campaigns:view',
    'campaigns:manage',
  ],
  faculty: [
    'students:view',
    'students:create',
    'students:update',
    'students:import',
    'reports:view',
    'companies:view',
    'readiness:view',
    'tech_stack:view',
    'tech_stack:update',
    'tech_stack:verify',
    'campaigns:view',
  ],
  interviewer: ['students:view'],
  hr: [],
  student: [],
}

export function hasPermission(role: PlacementRole | null | undefined, permission: string): boolean {
  if (!role) return false
  const perms = ROLE_PERMISSIONS[role]
  if (!perms) return false
  if (perms.includes('*')) return true
  return perms.includes(permission)
}

export function hasAnyPermission(role: PlacementRole | null | undefined, permissions: string[]): boolean {
  return permissions.some((p) => hasPermission(role, p))
}

export function getPlacementPrefix(role: PlacementRole | null | undefined): string | null {
  if (role === 'admin') return '/admin'
  if (role === 'tpo') return '/tpo'
  if (role === 'faculty') return '/faculty'
  if (role === 'student') return '/student'
  return null
}

export function canViewStudents(role: PlacementRole | null | undefined) {
  return hasPermission(role, 'students:view')
}

export function canManageStudents(role: PlacementRole | null | undefined) {
  return hasAnyPermission(role, ['students:create', 'students:export'])
}

export function canViewReports(role: PlacementRole | null | undefined) {
  return hasPermission(role, 'reports:view')
}

export function canExportReports(role: PlacementRole | null | undefined) {
  return hasPermission(role, 'reports:export')
}

export function canManageCompanies(role: PlacementRole | null | undefined) {
  return hasPermission(role, 'companies:manage')
}

export function canRunMatching(role: PlacementRole | null | undefined) {
  return hasPermission(role, 'matching:run')
}

export function canExportResumeBooks(role: PlacementRole | null | undefined) {
  return hasAnyPermission(role, ['students:export', 'reports:export'])
}

export function canViewTechStack(role: PlacementRole | null | undefined) {
  return hasPermission(role, 'tech_stack:view') || role === 'admin'
}

export function canManageStudentTechStack(role: PlacementRole | null | undefined) {
  return hasAnyPermission(role, ['tech_stack:manage', 'tech_stack:update']) || role === 'admin'
}

export function canManageSkillMaster(role: PlacementRole | null | undefined) {
  return (
    hasPermission(role, 'tech_stack:master_manage')
    || role === 'admin'
    || role === 'tpo'
    || role === 'faculty'
  )
}

export function canVerifyTechSkills(role: PlacementRole | null | undefined) {
  return hasPermission(role, 'tech_stack:verify') || role === 'admin'
}

export function canViewCampaigns(role: PlacementRole | null | undefined) {
  return hasPermission(role, 'campaigns:view') || role === 'admin'
}

export function canManageCampaigns(role: PlacementRole | null | undefined) {
  return hasPermission(role, 'campaigns:manage') || role === 'admin'
}
