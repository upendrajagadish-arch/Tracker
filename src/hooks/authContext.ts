import { createContext } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import type { PlacementRole } from '@/lib/placementPermissions'
import type { PlacementUserProfile } from '@/lib/placementAuth'

export interface AuthContextValue {
  session: Session | null
  user: User | null
  isLoading: boolean
  isConfigured: boolean
  placementProfile: PlacementUserProfile | null
  placementRole: PlacementRole | null
  placementLoading: boolean
  refreshPlacementProfile: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
