import { useCallback, useEffect, useState } from 'react'
import { CommunicationModuleNav } from '@/components/placement/CommunicationModuleNav'
import { PlacementShell } from '@/components/placement/PlacementShell'
import { PlacementPageHeader } from '@/components/placement/PlacementPageHeader'
import { PlacementEmptyState } from '@/components/placement/PlacementStates'
import { PlacementAlerts, PlacementPageStack } from '@/components/placement/PlacementUi'
import {
  BADGE_CHART_COLORS,
  LuxuryAreaChart,
  LuxuryBarChart,
  LuxuryDonutChart,
  LuxuryKpiStrip,
} from '@/components/placement/charts'
import {
  getCommunicationDashboard,
  listCommunicationEvaluations,
} from '@/api/placement/communicationEvaluations'
import { canViewCommunicationModule } from '@/lib/placementNavigation'
import { useAuth } from '@/hooks/useAuth'

export function CommunicationAnalyticsPage() {
  const { placementRole } = useAuth()
  const canView = canViewCommunicationModule(placementRole)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState({
    totalEvaluated: 0,
    averageCommunicationScore: 0,
    gradeAPlus: 0,
    needsImprovement: 0,
  })
  const [badges, setBadges] = useState({
    goldCount: 0,
    silverCount: 0,
    bronzeCount: 0,
    poorCount: 0,
    filteredTotal: 0,
    goldPercent: 0,
    silverPercent: 0,
    bronzePercent: 0,
    poorPercent: 0,
  })
  const [gradeBars, setGradeBars] = useState<Array<{ name: string; value: number }>>([])

  const load = useCallback(async () => {
    if (!canView) return
    setLoading(true)
    setError(null)
    try {
      const [listResult, dashboard] = await Promise.all([
        listCommunicationEvaluations({ page: 1, limit: 50, latestOnly: true }),
        getCommunicationDashboard({}, { audit: false }),
      ])
      setSummary(listResult.summary)
      setBadges(dashboard)

      const gradeCounts = new Map<string, number>()
      for (const row of listResult.data) {
        const grade = row.grade || 'Unknown'
        gradeCounts.set(grade, (gradeCounts.get(grade) ?? 0) + 1)
      }
      // Prefer full cohort summary when available via totalEvaluated vs page slice
      setGradeBars(
        [...gradeCounts.entries()]
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value),
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }, [canView])

  useEffect(() => {
    void load()
  }, [load])

  const badgeDonut = [
    { name: 'Gold', value: badges.goldCount, color: BADGE_CHART_COLORS.gold },
    { name: 'Silver', value: badges.silverCount, color: BADGE_CHART_COLORS.silver },
    { name: 'Bronze', value: badges.bronzeCount, color: BADGE_CHART_COLORS.bronze },
    { name: 'Poor', value: badges.poorCount, color: BADGE_CHART_COLORS.poor },
  ]

  const performanceArea = [
    { name: 'Evaluated', value: summary.totalEvaluated },
    { name: 'Average %', value: summary.averageCommunicationScore },
    { name: 'A+', value: summary.gradeAPlus },
    { name: 'Needs improvement', value: summary.needsImprovement },
  ]

  return (
    <PlacementShell title="Communication Analytics">
      <PlacementPageHeader
        title="Communication Analytics"
        description="Graphical grade and badge intelligence for Communication Evaluation."
      />

      <CommunicationModuleNav />

      {!canView ? (
        <PlacementEmptyState
          title="403 Forbidden"
          description="Only Admin, TPO, and Faculty can access Communication Analytics."
        />
      ) : (
        <PlacementPageStack>
          <PlacementAlerts error={error} />
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <>
              <LuxuryKpiStrip
                items={[
                  { label: 'Total evaluated', value: summary.totalEvaluated },
                  { label: 'Average %', value: summary.averageCommunicationScore },
                  { label: 'A+ grades', value: summary.gradeAPlus },
                  { label: 'Needs improvement', value: summary.needsImprovement },
                  { label: 'Gold students', value: badges.goldCount, hint: `${badges.goldPercent}%` },
                  { label: 'Silver students', value: badges.silverCount, hint: `${badges.silverPercent}%` },
                  { label: 'Bronze students', value: badges.bronzeCount, hint: `${badges.bronzePercent}%` },
                  { label: 'Poor students', value: badges.poorCount, hint: `${badges.poorPercent}%` },
                  { label: 'Badge cohort', value: badges.filteredTotal },
                ]}
              />

              <div className="grid gap-4 lg:grid-cols-2">
                <LuxuryDonutChart
                  title="Badge mix"
                  subtitle="Gold / Silver / Bronze / Poor cohort share"
                  data={badgeDonut}
                  centerLabel="Total"
                  centerValue={badges.filteredTotal}
                />
                <LuxuryBarChart
                  title="Grade distribution"
                  subtitle="Letter grades across latest evaluations (current page sample)"
                  data={gradeBars}
                  layout="horizontal"
                  height={320}
                />
              </div>

              <LuxuryAreaChart
                title="Performance pulse"
                subtitle="Evaluated volume vs average % and improvement flags"
                data={performanceArea}
                color="#F0B90B"
              />
            </>
          )}
        </PlacementPageStack>
      )}
    </PlacementShell>
  )
}
