import { PlacementShell } from '@/components/placement/PlacementShell'
import { PlacementPageHeader } from '@/components/placement/PlacementPageHeader'
import { PlacementComingSoon, PlacementPageStack } from '@/components/placement/PlacementUi'

export function PlacementPassportPage() {
  return (
    <PlacementShell title="Placement Passport">
      <PlacementPageHeader
        title="Placement Passport"
        description="A consolidated student placement dossier for external sharing."
      />

      <PlacementPageStack>
        <PlacementComingSoon
          title="Placement Passport"
          description="Placement Passport will package student profile, resume, tech stack, readiness, and coding summary into one shareable dossier. This module is planned for a later phase."
        />
      </PlacementPageStack>
    </PlacementShell>
  )
}
