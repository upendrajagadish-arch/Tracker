import { useCallback, useEffect, useState, type MouseEvent } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CommunicationModuleNav } from '@/components/placement/CommunicationModuleNav'
import { PlacementShell, usePlacementPaths } from '@/components/placement/PlacementShell'
import { PlacementPageHeader } from '@/components/placement/PlacementPageHeader'
import { PlacementEmptyState } from '@/components/placement/PlacementStates'
import {
  PlacementAlerts,
  PlacementField,
  PlacementFilterCard,
  PlacementPageStack,
  PlacementSectionCard,
} from '@/components/placement/PlacementUi'
import {
  BADGE_CHART_COLORS,
  LuxuryDonutChart,
} from '@/components/placement/charts'
import { CommunicationParameterWheel } from '@/components/placement/dashboard/PremiumDashboard'
import {
  exportCommunicationBadgeStudents,
  exportCommunicationDashboardStudents,
  getCommunicationDashboard,
  type CommunicationDashboardSummary,
} from '@/api/placement/communicationEvaluations'
import { getPremiumDashboard, type DashboardSnapshot } from '@/api/placement/premiumDashboard'
import {
  COMMUNICATION_BADGE_EMOJI,
  COMMUNICATION_BADGE_LABELS,
  COMMUNICATION_BADGE_ORDER,
  type CommunicationBadge,
} from '@/lib/communicationBadge'
import { canViewCommunicationModule } from '@/lib/placementNavigation'
import { useAuth } from '@/hooks/useAuth'
import { usePassOutYearFilter } from '@/lib/placementYearFilter'

const BADGE_CARDS: CommunicationBadge[] = COMMUNICATION_BADGE_ORDER

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function CommunicationDashboardPage() {
  const { placementRole } = useAuth()
  const { base } = usePlacementPaths()
  const navigate = useNavigate()
  const canView = canViewCommunicationModule(placementRole)
  const { year, graduationYear } = usePassOutYearFilter()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<CommunicationDashboardSummary | null>(null)
  const [communicationParameters, setCommunicationParameters] = useState<
    DashboardSnapshot['communicationParameters']
  >([])
  const [filters, setFilters] = useState({
    branch: '',
    search: '',
  })

  const load = useCallback(async () => {
    if (!canView) return
    setLoading(true)
    setError(null)
    try {
      const yearKey = year === 'all' ? 'all' : year
      const [result, snapshot] = await Promise.all([
        getCommunicationDashboard({
          graduationYear,
          branch: filters.branch || undefined,
          search: filters.search || undefined,
        }),
        getPremiumDashboard(yearKey).catch(() => null),
      ])
      setSummary(result)
      setCommunicationParameters(snapshot?.communicationParameters ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }, [canView, filters, graduationYear, year])

  useEffect(() => {
    void load()
  }, [load])

  const openBadge = (badge: CommunicationBadge) => {
    if (!base) return
    void navigate({
      to: `${base}/communication/badge/$badge` as '/admin/placement/communication/badge/$badge',
      params: { badge },
      search: {
        academicBatch: year === 'all' ? undefined : year,
        branch: filters.branch || undefined,
        search: filters.search || undefined,
      },
    })
  }

  const handleDownloadAll = async () => {
    try {
      const csv = await exportCommunicationDashboardStudents({
        graduationYear,
        branch: filters.branch || undefined,
        search: filters.search || undefined,
      })
      downloadCsv(csv, 'communication-dashboard.csv')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed')
    }
  }

  const handleDownloadBadge = async (badge: CommunicationBadge, event: MouseEvent) => {
    event.stopPropagation()
    try {
      const csv = await exportCommunicationBadgeStudents(badge, {
        graduationYear,
        branch: filters.branch || undefined,
        search: filters.search || undefined,
      })
      downloadCsv(csv, `Download ${COMMUNICATION_BADGE_LABELS[badge]} List.csv`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed')
    }
  }

  const counts: Record<CommunicationBadge, { count: number; percent: number }> = {
    gold: { count: summary?.goldCount ?? 0, percent: summary?.goldPercent ?? 0 },
    silver: { count: summary?.silverCount ?? 0, percent: summary?.silverPercent ?? 0 },
    bronze: { count: summary?.bronzeCount ?? 0, percent: summary?.bronzePercent ?? 0 },
    poor: { count: summary?.poorCount ?? 0, percent: summary?.poorPercent ?? 0 },
  }

  const filteredTotal = summary?.filteredTotal ?? 0

  const badgeDonuts = BADGE_CARDS.map((badge) => ({
    badge,
    data: [
      {
        name: COMMUNICATION_BADGE_LABELS[badge],
        value: counts[badge].count,
        color: BADGE_CHART_COLORS[badge],
      },
      {
        name: 'Others',
        value: Math.max(0, filteredTotal - counts[badge].count),
        color: '#2B3139',
      },
    ],
  }))

  return (
    <PlacementShell title="Communication Dashboard">
      <PlacementPageHeader
        title="Communication Dashboard"
        description={
          loading
            ? 'Gold / Silver / Bronze / Poor analytics for Communication Evaluation.'
            : `${filteredTotal} evaluated students · Gold / Silver / Bronze / Poor performance breakdown.`
        }
        actions={
          canView ? (
            <Button type="button" variant="outline" size="sm" onClick={() => void handleDownloadAll()}>
              Download
            </Button>
          ) : null
        }
      />

      <CommunicationModuleNav />

      {!canView ? (
        <PlacementEmptyState
          title="403 Forbidden"
          description="Only Admin, TPO, and Faculty can access the Communication Dashboard."
        />
      ) : (
        <PlacementPageStack>
          <PlacementAlerts error={error} />

          <PlacementFilterCard
            actions={
              <Button type="button" size="sm" onClick={() => void load()}>
                Apply
              </Button>
            }
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <PlacementField label="Branch">
                <Input
                  className="border-border bg-card"
                  value={filters.branch}
                  onChange={(e) => setFilters((f) => ({ ...f, branch: e.target.value }))}
                  placeholder="e.g. CSE"
                />
              </PlacementField>
              <PlacementField label="Search">
                <Input
                  className="border-border bg-card"
                  value={filters.search}
                  onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                  placeholder="Roll / name"
                />
              </PlacementField>
            </div>
          </PlacementFilterCard>

          {!loading && communicationParameters.length ? (
            <PlacementSectionCard
              title="Communication Readiness"
              description="Interactive parameter wheel for every evaluation criterion."
            >
              <CommunicationParameterWheel parameters={communicationParameters} />
            </PlacementSectionCard>
          ) : null}

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:items-stretch">
              {badgeDonuts.map(({ badge, data }) => (
                <LuxuryDonutChart
                  key={badge}
                  className="h-full"
                  title={`${COMMUNICATION_BADGE_EMOJI[badge]} ${COMMUNICATION_BADGE_LABELS[badge]}`}
                  subtitle={`${counts[badge].count} Students · ${counts[badge].percent}% of cohort`}
                  data={data}
                  height={240}
                  hideLegend
                  centerValue={`${counts[badge].percent}%`}
                  centerLabel={`${counts[badge].count} Students`}
                  onSliceClick={(name) => {
                    if (name.toLowerCase() === COMMUNICATION_BADGE_LABELS[badge].toLowerCase()) {
                      openBadge(badge)
                    }
                  }}
                  actions={
                    <>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => openBadge(badge)}
                      >
                        View students
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={(e) => void handleDownloadBadge(badge, e)}
                      >
                        ↓ Export
                      </Button>
                    </>
                  }
                />
              ))}
            </div>
          )}
        </PlacementPageStack>
      )}
    </PlacementShell>
  )
}
