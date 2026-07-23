import { useMemo } from 'react'
import {
  ActivityTimeline,
  HomeHero,
  HomeSection,
  NewsFeed,
} from '@/components/placement/home/HomeKit'
import {
  APP_UPDATES,
  illustrationLabelForRole,
  importantNewsForRole,
  pickRoleQuote,
  type HomeRole,
} from '@/lib/placementHomeContent'

/** Welcome + important news + app updates only — no dashboard metrics. */
export function RoleHomeLanding({
  role,
  displayName,
}: {
  role: HomeRole
  displayName: string
}) {
  const quote = useMemo(() => pickRoleQuote(role), [role])
  const news = useMemo(() => importantNewsForRole(role), [role])

  return (
    <div className="space-y-6">
      <HomeHero
        name={displayName}
        quote={quote}
        illustrationLabel={illustrationLabelForRole(role)}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <HomeSection title="Important news" subtitle="Need-to-know notes for your workspace.">
          <NewsFeed items={news} />
        </HomeSection>
        <HomeSection title="What's new" subtitle="Recent updates in the application.">
          <ActivityTimeline items={APP_UPDATES} />
        </HomeSection>
      </div>
    </div>
  )
}
