import { useCallback, useEffect, useState, type MouseEvent } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { CommunicationModuleNav } from '@/components/placement/CommunicationModuleNav'
import { PlacementShell, usePlacementPaths } from '@/components/placement/PlacementShell'
import { PlacementPageHeader } from '@/components/placement/PlacementPageHeader'
import { PlacementEmptyState } from '@/components/placement/PlacementStates'
import {
  PlacementAlerts,
  PlacementField,
  PlacementFilterCard,
  PlacementPageStack,
  PlacementSelect,
} from '@/components/placement/PlacementUi'
import {
  BADGE_CHART_COLORS,
  LuxuryBarChart,
  LuxuryDonutChart,
  LuxuryKpiStrip,
} from '@/components/placement/charts'
import {
  exportCommunicationBadgeStudents,
  exportCommunicationDashboardStudents,
  getCommunicationDashboard,
  type CommunicationDashboardSummary,
} from '@/api/placement/communicationEvaluations'
import {
  COMMUNICATION_ACADEMIC_BATCH_OPTIONS,
  COMMUNICATION_BADGE_EMOJI,
  COMMUNICATION_BADGE_LABELS,
  COMMUNICATION_BRANCH_OPTIONS,
  type CommunicationBadge,
} from '@/lib/communicationBadge'
import { canViewCommunicationModule } from '@/lib/placementNavigation'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

const BADGE_CARDS: CommunicationBadge[] = ['gold', 'silver', 'bronze']

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

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<CommunicationDashboardSummary | null>(null)
  const [filters, setFilters] = useState({
    academicBatch: '',
    branch: '',
    search: '',
  })

  const load = useCallback(async () => {
    if (!canView) return
    setLoading(true)
    setError(null)
    try {
      const result = await getCommunicationDashboard({
        academicBatch: filters.academicBatch || undefined,
        branch: filters.branch || undefined,
        search: filters.search || undefined,
      })
      setSummary(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }, [canView, filters])

  useEffect(() => {
    void load()
  }, [load])

  const openBadge = (badge: CommunicationBadge) => {
    if (!base) return
    void navigate({
      to: `${base}/communication/badge/$badge` as '/admin/placement/communication/badge/$badge',
      params: { badge },
      search: {
        academicBatch: filters.academicBatch || undefined,
        branch: filters.branch || undefined,
        search: filters.search || undefined,
      },
    })
  }

  const handleDownloadAll = async () => {
    try {
      const csv = await exportCommunicationDashboardStudents({
        academicBatch: filters.academicBatch || undefined,
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
        academicBatch: filters.academicBatch || undefined,
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
  }

  const badgeDonut = BADGE_CARDS.map((badge) => ({
    name: COMMUNICATION_BADGE_LABELS[badge],
    value: counts[badge].count,
    color: BADGE_CHART_COLORS[badge],
  }))

  const badgeBars = BADGE_CARDS.map((badge) => ({
    name: COMMUNICATION_BADGE_LABELS[badge],
    value: counts[badge].percent,
    color: BADGE_CHART_COLORS[badge],
  }))

  return (
    <PlacementShell title="Communication Dashboard">
      <PlacementPageHeader
        title="Communication Dashboard"
        description="Luxury Gold / Silver / Bronze analytics for Communication Evaluation."
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
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <PlacementField label="Academic Batch">
                <PlacementSelect
                  value={filters.academicBatch}
                  onChange={(value) => setFilters((f) => ({ ...f, academicBatch: value }))}
                >
                  <option value="">All</option>
                  {COMMUNICATION_ACADEMIC_BATCH_OPTIONS.map((batch) => (
                    <option key={batch} value={batch}>
                      {batch}
                    </option>
                  ))}
                </PlacementSelect>
              </PlacementField>
              <PlacementField label="Branch">
                <PlacementSelect
                  value={filters.branch}
                  onChange={(value) => setFilters((f) => ({ ...f, branch: value }))}
                >
                  <option value="">All</option>
                  {COMMUNICATION_BRANCH_OPTIONS.map((branch) => (
                    <option key={branch} value={branch}>
                      {branch}
                    </option>
                  ))}
                </PlacementSelect>
              </PlacementField>
              <PlacementField label="Search">
                <input
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  value={filters.search}
                  onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                  placeholder="Roll / name"
                />
              </PlacementField>
            </div>
          </PlacementFilterCard>

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <>
              <LuxuryKpiStrip
                items={[
                  { label: 'Filtered total', value: summary?.filteredTotal ?? 0 },
                  { label: 'Gold %', value: `${summary?.goldPercent ?? 0}%` },
                  { label: 'Silver %', value: `${summary?.silverPercent ?? 0}%` },
                  { label: 'Bronze %', value: `${summary?.bronzePercent ?? 0}%` },
                ]}
              />

              <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-3">
                {BADGE_CARDS.map((badge) => (
                  <button
                    key={badge}
                    type="button"
                    onClick={() => openBadge(badge)}
                    className={cn(
                      'rounded-card border border-soft bg-gradient-to-br from-card via-card to-[#D27918]/[0.08] p-5 text-left shadow-[0_0_0_1px_rgba(210,121,24,0.06)] transition-colors hover:border-binance/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]/40',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[13px] font-semibold uppercase tracking-wide text-secondary">
                        {COMMUNICATION_BADGE_EMOJI[badge]} {COMMUNICATION_BADGE_LABELS[badge]}
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={(e) => void handleDownloadBadge(badge, e)}
                      >
                        ↓
                      </Button>
                    </div>
                    <p className="tnum mt-3 text-[36px] font-bold tracking-tight text-binance">
                      {counts[badge].count}
                    </p>
                    <p className="mt-1 text-sm text-secondary">
                      {counts[badge].count} Students · {counts[badge].percent}%
                    </p>
                  </button>
                ))}
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <LuxuryDonutChart
                  title="Badge distribution"
                  subtitle="Share of evaluated students by Gold / Silver / Bronze"
                  data={badgeDonut}
                  centerLabel="Cohort"
                  centerValue={summary?.filteredTotal ?? 0}
                  onSliceClick={(name) => {
                    const badge = BADGE_CARDS.find(
                      (b) => COMMUNICATION_BADGE_LABELS[b].toLowerCase() === name.toLowerCase(),
                    )
                    if (badge) openBadge(badge)
                  }}
                />
                <LuxuryBarChart
                  title="Badge percentage mix"
                  subtitle="Percent of filtered cohort in each badge"
                  data={badgeBars}
                />
              </div>
            </>
          )}
        </PlacementPageStack>
      )}
    </PlacementShell>
  )
}
