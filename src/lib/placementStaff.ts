import type { PlacementRole } from '@/lib/placementPermissions'

/** Roles that may use the placement office (no student login). */
export const STAFF_PLACEMENT_ROLES: PlacementRole[] = ['admin', 'tpo', 'faculty', 'interviewer']

export function isStaffPlacementRole(role: PlacementRole | null | undefined): boolean {
  return role != null && STAFF_PLACEMENT_ROLES.includes(role)
}

/** Staff who can switch between placement office and the coding platform dashboard. */
export function canUseWorkspaceTabs(role: PlacementRole | null | undefined): boolean {
  return role === 'admin' || role === 'tpo' || role === 'faculty'
}
