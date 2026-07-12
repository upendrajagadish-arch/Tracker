import type { PlacementRole } from '@/lib/placementPermissions'
import type { PlacementUserProfile } from '@/lib/placementAuth'

export interface PlacementAuthContextValue {
  placementProfile: PlacementUserProfile | null
  placementRole: PlacementRole | null
  placementLoading: boolean
  refreshPlacementProfile: () => Promise<void>
}
