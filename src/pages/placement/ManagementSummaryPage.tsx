import { useCallback, useEffect, useState } from 'react'
import { PlacementLink } from '@/components/placement/PlacementLink'
import { Button } from '@/components/ui/button'
import { ManagementSummary } from '@/components/placement/reports/ManagementSummary'
import type { ManagementSummaryReport } from '@/components/placement/reports/ManagementSummary'
import { PlacementShell, usePlacementPaths } from '@/components/placement/PlacementShell'
import { PlacementPageHeader } from '@/components/placement/PlacementPageHeader'
import { PlacementErrorAlert, PlacementLoadingBlock } from '@/components/placement/PlacementStates'
import { exportReportCsv, getManagementSummary } from '@/api/placement/reports'
import { canExportReports } from '@/lib/placementNavigation'
import { useAuth } from '@/hooks/useAuth'

function toReport(summary: Awaited<ReturnType<typeof getManagementSummary>>): ManagementSummaryReport {
  return {
    generatedAt: summary.generatedAt,
    summary: [
      { label: 'Total students', value: summary.totalStudents },
      { label: 'Active students', value: summary.activeStudents },
      { label: 'Placement eligible', value: summary.placementEligible },
      { label: 'Average readiness', value: summary.averageReadiness },
      { label: 'Ready count', value: summary.readyCount },
      { label: 'Placed count', value: summary.placedCount },
      { label: 'Pending resumes', value: summary.pendingResumes },
      { label: 'Active companies', value: summary.activeCompanies },
      { label: 'Open requirements', value: summary.openRequirements },
    ],
    overview: {
      pipeline: [
        { label: 'Students tracked', value: summary.totalStudents },
        { label: 'Eligible for placement', value: summary.placementEligible },
        { label: 'Placed', value: summary.placedCount },
      ],
      readiness: [
        { label: 'Average readiness score', value: summary.averageReadiness },
        { label: 'Ready / highly ready', value: summary.readyCount },
      ],
      operations: [
        { label: 'Pending resume reviews', value: summary.pendingResumes },
        { label: 'Active companies', value: summary.activeCompanies },
        { label: 'Open requirements', value: summary.openRequirements },
      ],
    },
    keyGaps: summary.pendingResumes > 0
      ? [`${summary.pendingResumes} resumes awaiting review`]
      : [],
    recommendedActions: summary.readyCount < summary.placementEligible
      ? ['Schedule readiness workshops for students below ready threshold']
      : ['Maintain current placement readiness momentum'],
  }
}

export function ManagementSummaryPage() {
  const { base } = usePlacementPaths()
  const { placementRole } = useAuth()
  const canExport = canExportReports(placementRole)
  const [report, setReport] = useState<ManagementSummaryReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getManagementSummary()
      setReport(toReport(data))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load summary')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const handlePrint = () => window.print()

  const handleExport = async () => {
    setExporting(true)
    try {
      const csv = await exportReportCsv('placement-status', {})
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'management-summary.csv'
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  return (
    <PlacementShell title="Management Summary">
      <div className="management-summary-page">
        <div className="print:hidden">
          <PlacementPageHeader
            title="Management Summary"
            description="Executive placement operations overview for college management review."
            actions={
              <div className="flex flex-wrap gap-2">
                {base ? (
                  <Button asChild variant="outline" size="sm">
                    <PlacementLink href={`${base}/reports`}>← Reports</PlacementLink>
                  </Button>
                ) : null}
                <Button variant="outline" size="sm" onClick={handlePrint}>Print summary</Button>
                {canExport ? (
                  <Button size="sm" disabled={exporting} onClick={() => void handleExport()}>
                    {exporting ? 'Exporting…' : 'Export CSV'}
                  </Button>
                ) : null}
              </div>
            }
          />

          {error ? <div className="mb-4"><PlacementErrorAlert message={error} /></div> : null}
        </div>

        <div className="print-summary-header hidden text-center print:mb-8 print:block">
          <h1 className="text-2xl font-bold text-black">Placement Operations Summary</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {report?.generatedAt ? new Date(report.generatedAt).toLocaleString() : ''}
          </p>
        </div>

        {loading ? <PlacementLoadingBlock /> : (
          <div className="mt-8">
            <ManagementSummary report={report} printMode />
          </div>
        )}
      </div>
    </PlacementShell>
  )
}
