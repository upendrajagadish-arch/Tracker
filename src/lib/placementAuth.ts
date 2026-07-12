import { requireSupabase } from '@/lib/supabase'
import type { PlacementRole } from '@/lib/placementPermissions'
import { isStaffPlacementRole } from '@/lib/placementStaff'

export interface PlacementUserProfile {
  id: string
  email: string
  full_name: string
  role: PlacementRole
  roll_number: string | null
  expertise: string | null
}

export async function fetchPlacementProfile(userId: string): Promise<PlacementUserProfile | null> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('placement_user_profiles')
    .select('id, email, full_name, role, roll_number, expertise')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw error
  return data as PlacementUserProfile | null
}

export async function ensurePlacementProfile(userId: string, email: string, defaults: Partial<PlacementUserProfile> = {}) {
  const client = requireSupabase()
  const existing = await fetchPlacementProfile(userId)
  if (existing) return existing
  const { data, error } = await client
    .from('placement_user_profiles')
    .insert({
      id: userId,
      email,
      full_name: defaults.full_name ?? email.split('@')[0],
      role: defaults.role ?? 'student',
      roll_number: defaults.roll_number ?? null,
    })
    .select('id, email, full_name, role, roll_number, expertise')
    .single()
  if (error) throw error
  return data as PlacementUserProfile
}

export function placementHomeForRole(role: PlacementRole | null | undefined): string {
  if (!isStaffPlacementRole(role)) {
    if (role === 'hr') return '/app'
    return '/login'
  }
  switch (role) {
    case 'admin':
      return '/admin/placement'
    case 'tpo':
      return '/tpo/placement'
    case 'faculty':
      return '/faculty/placement'
    case 'interviewer':
      return '/interviewer/placement/students'
    default:
      return '/app'
  }
}
