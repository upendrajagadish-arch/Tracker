import { useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { PlacementLoadingBlock } from '@/components/placement/PlacementStates'
import { placementHomeForRole } from '@/lib/placementAuth'
import { useAuth } from '@/hooks/useAuth'

export function RemovedPlacementRedirectPage() {
  const navigate = useNavigate()
  const { placementRole } = useAuth()

  useEffect(() => {
    const home = placementHomeForRole(placementRole)
    navigate({ to: home as '/admin/placement' })
  }, [navigate, placementRole])

  return <PlacementLoadingBlock label="Redirecting…" />
}
