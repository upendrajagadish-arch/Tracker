import { useCallback, useEffect, useState } from 'react'
import { PlacementLink } from '@/components/placement/PlacementLink'
import { Button } from '@/components/ui/button'
import { PlacementShell, usePlacementPaths } from '@/components/placement/PlacementShell'
import { PlacementPageHeader } from '@/components/placement/PlacementPageHeader'
import {
  PlacementAlerts,
  PlacementPageBody,
  PlacementPageStack,
} from '@/components/placement/PlacementUi'
import { PlacementErrorAlert, PlacementStatCard } from '@/components/placement/PlacementStates'
import { getManagementSummary } from '@/api/placement/reports'
import { getTechStackDashboardStats } from '@/api/placement/techSkills'

export function PlacementDashboardPage() {
  const { base } = usePlacementPaths()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof getManagementSummary>> | null>(null)
  const [techStats, setTechStats] = useState<Awaited<ReturnType<typeof getTechStackDashboardStats>> | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [mgmt, tech] = await Promise.all([
        getManagementSummary(),
        getTechStackDashboardStats().catch(() => null),
      ])
      setSummary(mgmt)
      setTechStats(tech)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <PlacementShell title="Dashboard">
      <PlacementPageHeader
        title="Placement Dashboard"
        description="Overview of students, readiness, resumes, and placement operations."
        actions={
          base ? (
            <Button asChild variant="outline" size="sm">
              <PlacementLink href={`${base}/students`}>Open student tracker</PlacementLink>
            </Button>
          ) : null
        }
      />

      <PlacementPageStack>
        <PlacementAlerts error={error} />

        <PlacementPageBody loading={loading} loadingLabel="Loading dashboard…">
          {summary ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <PlacementStatCard label="Active students" value={summary.activeStudents} />
                <PlacementStatCard label="Placement eligible" value={summary.placementEligible} />
                <PlacementStatCard label="Average readiness" value={summary.averageReadiness} />
                <PlacementStatCard label="Pending resumes" value={summary.pendingResumes} hint="Awaiting review" />
                <PlacementStatCard label="Ready students" value={summary.readyCount} />
                <PlacementStatCard label="Placed students" value={summary.placedCount} />
              </div>

              {techStats ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <PlacementStatCard label="Students with tech stack" value={techStats.studentsWithTechStack} />
                  <PlacementStatCard label="Avg verified skills" value={techStats.averageVerifiedSkillsPerStudent} />
                  <PlacementStatCard label="Top skill" value={techStats.topSkills[0]?.skill ?? '—'} hint={techStats.topSkills[0] ? `${techStats.topSkills[0].studentCount} students` : undefined} />
                  <PlacementStatCard label="Top category" value={techStats.categoryDistribution[0]?.category?.replace(/_/g, ' ') ?? '—'} />
                </div>
              ) : null}
            </>
          ) : null}
        </PlacementPageBody>
      </PlacementPageStack>

      {!loading && !summary && !error ? (
        <PlacementErrorAlert message="Dashboard data is unavailable." />
      ) : null}
    </PlacementShell>
  )
}
