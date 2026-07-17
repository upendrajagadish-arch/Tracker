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
import { PlacementErrorAlert } from '@/components/placement/PlacementStates'
import {
  LuxuryAreaChart,
  LuxuryBarChart,
  LuxuryDonutChart,
  LuxuryKpiStrip,
} from '@/components/placement/charts'
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

  const pipelineDonut = summary
    ? [
        { name: 'Ready', value: summary.readyCount, color: '#0ECB81' },
        { name: 'Placed', value: summary.placedCount, color: '#F0B90B' },
        {
          name: 'In pipeline',
          value: Math.max(
            0,
            summary.activeStudents - summary.readyCount - summary.placedCount,
          ),
          color: '#3B82F6',
        },
      ]
    : []

  const operationsBars = summary
    ? [
        { name: 'Active', value: summary.activeStudents },
        { name: 'Eligible', value: summary.placementEligible },
        { name: 'Ready', value: summary.readyCount },
        { name: 'Placed', value: summary.placedCount },
        { name: 'Pending resumes', value: summary.pendingResumes },
      ]
    : []

  const readinessArea = summary
    ? [
        { name: 'Eligible', value: summary.placementEligible },
        { name: 'Avg readiness', value: summary.averageReadiness },
        { name: 'Ready', value: summary.readyCount },
        { name: 'Placed', value: summary.placedCount },
      ]
    : []

  const skillBars =
    techStats?.topSkills.map((row) => ({
      name: row.skill,
      value: row.studentCount,
    })) ?? []

  const categoryDonut =
    techStats?.categoryDistribution.map((row) => ({
      name: row.category.replace(/_/g, ' '),
      value: row.studentCount,
    })) ?? []

  return (
    <PlacementShell title="Dashboard">
      <PlacementPageHeader
        title="Placement Dashboard"
        description="Luxury overview of students, readiness, resumes, and placement operations."
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <a href="/public/leaderboard" target="_blank" rel="noreferrer">
                🏆 Hall of Fame
              </a>
            </Button>
            {base ? (
              <Button asChild variant="outline" size="sm">
                <PlacementLink href={`${base}/students`}>Open student tracker</PlacementLink>
              </Button>
            ) : null}
          </>
        }
      />

      <PlacementPageStack>
        <PlacementAlerts error={error} />

        <PlacementPageBody loading={loading} loadingLabel="Loading dashboard…">
          {summary ? (
            <>
              <LuxuryKpiStrip
                items={[
                  { label: 'Active students', value: summary.activeStudents },
                  { label: 'Placement eligible', value: summary.placementEligible },
                  { label: 'Average readiness', value: summary.averageReadiness },
                  { label: 'Pending resumes', value: summary.pendingResumes, hint: 'Awaiting review' },
                  { label: 'Ready students', value: summary.readyCount },
                  { label: 'Placed students', value: summary.placedCount },
                ]}
                className="lg:grid-cols-3 xl:grid-cols-6"
              />

              <div className="grid gap-4 lg:grid-cols-2">
                <LuxuryDonutChart
                  title="Placement pipeline"
                  subtitle="Ready · Placed · Remaining active cohort"
                  data={pipelineDonut}
                  centerLabel="Active"
                  centerValue={summary.activeStudents}
                />
                <LuxuryBarChart
                  title="Operations snapshot"
                  subtitle="Key placement counts at a glance"
                  data={operationsBars}
                />
              </div>

              <LuxuryAreaChart
                title="Readiness pulse"
                subtitle="Eligible → readiness → ready → placed"
                data={readinessArea}
                color="#D27918"
              />

              {techStats ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  <LuxuryDonutChart
                    title="Tech stack categories"
                    subtitle="Students represented in each skill category"
                    data={categoryDonut}
                    centerLabel="With stack"
                    centerValue={techStats.studentsWithTechStack}
                  />
                  <LuxuryBarChart
                    title="Top skills"
                    subtitle="Most declared skills across students"
                    data={skillBars}
                    layout="horizontal"
                    height={320}
                  />
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
