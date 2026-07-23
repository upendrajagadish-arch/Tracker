import { PlacementShell } from '@/components/placement/PlacementShell'
import { RoleHomeLanding } from '@/components/placement/home/RoleHomeLanding'
import { useAuth } from '@/hooks/useAuth'

/** Interviewer home — welcome, news, and app updates only. */
export function InterviewerHomePage() {
  const { placementProfile, user } = useAuth()
  const displayName =
    placementProfile?.full_name?.trim() || user?.email?.split('@')[0] || 'Interviewer'

  return (
    <PlacementShell>
      <RoleHomeLanding role="interviewer" displayName={displayName} />
    </PlacementShell>
  )
}
