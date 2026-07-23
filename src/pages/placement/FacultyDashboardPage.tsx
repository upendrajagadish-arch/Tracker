import { PlacementShell } from '@/components/placement/PlacementShell'
import { FacultyHomeLanding } from '@/components/placement/home/FacultyHomeLanding'
import { FacultyClassicDashboard } from '@/components/placement/home/FacultyClassicDashboard'
import { PassOutYearFilterBar, usePassOutYearFilter } from '@/lib/placementYearFilter'
import { useAuth } from '@/hooks/useAuth'

/** Home = welcome + news + updates. Dashboard mode = classic operational view. */
export function FacultyDashboardPage({ mode = 'home' }: { mode?: 'home' | 'dashboard' }) {
  const { placementProfile, user } = useAuth()
  const { year, setYear } = usePassOutYearFilter()

  const displayName =
    placementProfile?.full_name?.trim() || user?.email?.split('@')[0] || 'Faculty'

  if (mode === 'dashboard') {
    return (
      <PlacementShell>
        <div className="mb-1 flex justify-end">
          <PassOutYearFilterBar
            value={year}
            onChange={(next) => {
              setYear(next)
            }}
          />
        </div>
        <FacultyClassicDashboard />
      </PlacementShell>
    )
  }

  return (
    <PlacementShell>
      <FacultyHomeLanding displayName={displayName} />
    </PlacementShell>
  )
}

export function FacultyClassicDashboardPage() {
  return <FacultyDashboardPage mode="dashboard" />
}
