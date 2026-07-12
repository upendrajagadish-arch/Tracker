import { PlacementShell } from '@/components/placement/PlacementShell'
import { PlacementPageHeader } from '@/components/placement/PlacementPageHeader'
import { PlacementComingSoon, PlacementPageStack } from '@/components/placement/PlacementUi'
import { PlacementEmptyState } from '@/components/placement/PlacementStates'
import { useAuth } from '@/hooks/useAuth'

export function HRTalentRoomPage() {
  const { placementRole } = useAuth()
  const canPreview = placementRole === 'admin' || placementRole === 'tpo' || placementRole === 'faculty'

  return (
    <PlacementShell title="HR Talent Room">
      <PlacementPageHeader
        title="HR Talent Room"
        description="Recruiter-facing shortlists and interview-ready student views."
      />

      {!canPreview ? (
        <PlacementEmptyState
          title="HR access not enabled"
          description="HR Talent Room is not available for this role yet."
        />
      ) : (
        <PlacementPageStack>
          <PlacementComingSoon
            title="HR Talent Room"
            description="This module will provide recruiter shortlists, interview notes, and secure student sharing. It is planned for a later phase and is not active yet."
          />
        </PlacementPageStack>
      )}
    </PlacementShell>
  )
}
