import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { AuthContext, type AuthContextValue } from '@/hooks/authContext'
import { fetchPlacementProfile, type PlacementUserProfile } from '@/lib/placementAuth'
import type { PlacementRole } from '@/lib/placementPermissions'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured)
  const [placementProfile, setPlacementProfile] = useState<PlacementUserProfile | null>(null)
  const [placementLoading, setPlacementLoading] = useState(false)

  const loadPlacement = useCallback(async (userId: string | undefined) => {
    if (!userId || !supabase) {
      setPlacementProfile(null)
      return
    }
    setPlacementLoading(true)
    try {
      const profile = await fetchPlacementProfile(userId)
      setPlacementProfile(profile)
    } catch {
      setPlacementProfile(null)
    } finally {
      setPlacementLoading(false)
    }
  }, [])

  const refreshPlacementProfile = useCallback(async () => {
    await loadPlacement(session?.user?.id)
  }, [loadPlacement, session?.user?.id])

  useEffect(() => {
    if (!supabase) return

    let mounted = true
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session)
      setIsLoading(false)
      void loadPlacement(data.session?.user?.id)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setIsLoading(false)
      void loadPlacement(nextSession?.user?.id)
    })

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [loadPlacement])

  const value = useMemo<AuthContextValue>(() => ({
    session,
    user: session?.user ?? null,
    isLoading,
    isConfigured: isSupabaseConfigured,
    placementProfile,
    placementRole: (placementProfile?.role ?? null) as PlacementRole | null,
    placementLoading,
    refreshPlacementProfile,
  }), [session, isLoading, placementProfile, placementLoading, refreshPlacementProfile])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
