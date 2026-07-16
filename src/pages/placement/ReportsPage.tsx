import { useCallback, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ReportFilters, type ReportFilterValues } from '@/components/placement/reports/ReportFilters'
import { ReportSection } from '@/components/placement/reports/ReportSection'
import { ReportSummaryCards } from '@/components/placement/reports/ReportSummaryCards'
import {
  LuxuryAreaChart,
  LuxuryBarChart,
  LuxuryDonutChart,
} from '@/components/placement/charts'
import { reportToCharts } from '@/components/placement/charts/reportCharts'
import { PlacementShell } from '@/components/placement/PlacementShell'
import { PlacementPageHeader } from '@/components/placement/PlacementPageHeader'
import { PlacementEmptyState } from '@/components/placement/PlacementStates'
import {
  PlacementAlerts,
  PlacementField,
  PlacementFilterCard,
  PlacementPageBody,
  PlacementPageStack,
  PlacementSelect,
} from '@/components/placement/PlacementUi'
import { exportReportCsv, getReport, type PlacementReportType, type ReportResult } from '@/api/placement/reports'
import { canExportReports } from '@/lib/placementNavigation'
import { useAuth } from '@/hooks/useAuth'

const REPORT_TYPES: { id: PlacementReportType; label: string }[] = [
  { id: 'branch-summary', label: 'Branch Summary' },
  { id: 'batch-summary', label: 'Batch Summary' },
  { id: 'readiness-overview', label: 'Readiness Overview' },
  { id: 'skill-gap', label: 'Skill Gap' },
  { id: 'placement-status', label: 'Placement Status' },
  { id: 'resume-review', label: 'Resume Review' },
  { id: 'company-pipeline', label: 'Company Pipeline' },
]

function toApiFilters(filters: ReportFilterValues) {
  return {
    branch: filters.branch,
    batch: filters.batch,
    placementStatus: filters.placementStatus,
    readinessStatus: filters.readinessStatus,
  }
}

function summaryToCards(summary: Record<string, number | string>) {
  return Object.entries(summary).map(([label, value]) => ({
    label: label.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim(),
    value,
  }))
}

function reportToSection(report: ReportResult) {
  if (!report.rows.length) return null
  const columns = Object.keys(report.rows[0])
  const rows = report.rows.map((row) => columns.map((col) => {
    const val = row[col]
    return val == null ? '—' : String(val)
  }))
  return {
    title: `${report.reportType} details`,
    type: 'table' as const,
    columns,
    rows,
  }
}

export function ReportsPage() {
  const { placementRole } = useAuth()
  const canExport = canExportReports(placementRole)
  const [reportType, setReportType] = useState<PlacementReportType>('branch-summary')
  const [filters, setFilters] = useState<ReportFilterValues>({})
  const [report, setReport] = useState<ReportResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasRun, setHasRun] = useState(false)

  const loadReport = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getReport(reportType, toApiFilters(filters))
      setReport(data)
      setHasRun(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate report')
      setReport(null)
    } finally {
      setLoading(false)
    }
  }, [reportType, filters])

  const handleExport = async () => {
    setExporting(true)
    setError(null)
    try {
      const csv = await exportReportCsv(reportType, toApiFilters(filters))
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${reportType}-report.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  const charts = useMemo(() => (report ? reportToCharts(report) : null), [report])

  return (
    <PlacementShell title="Analytics">
      <PlacementPageHeader
        title="Analytics"
        description="Generate luxurious graphical placement reports across students, readiness, and pipeline data."
      />

      <PlacementPageStack>
        <PlacementAlerts error={error} />

        <PlacementFilterCard title="Report configuration">
          <PlacementField label="Report type" hint="Choose the dataset to analyze">
            <PlacementSelect
              value={reportType}
              onChange={(value) => {
                setReportType(value as PlacementReportType)
                setReport(null)
                setHasRun(false)
              }}
            >
              {REPORT_TYPES.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </PlacementSelect>
          </PlacementField>
        </PlacementFilterCard>

        <ReportFilters
          filters={filters}
          onChange={setFilters}
          onSubmit={(e) => {
            e.preventDefault()
            void loadReport()
          }}
        />

        <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={loading} onClick={() => void loadReport()}>
            {loading ? 'Generating…' : 'Generate report'}
          </Button>
          {canExport && hasRun ? (
            <Button size="sm" variant="outline" disabled={exporting} onClick={() => void handleExport()}>
              {exporting ? 'Exporting…' : 'Export CSV'}
            </Button>
          ) : null}
        </div>

        <PlacementPageBody
          loading={loading}
          loadingLabel="Generating report…"
          empty={hasRun && !report?.rows.length ? (
            <PlacementEmptyState title="No report rows" description="Try different filters or report type." />
          ) : undefined}
        >
          {report && report.rows.length ? (
            <div className="space-y-6">
              <ReportSummaryCards summary={summaryToCards(report.summary)} />

              {charts ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  <LuxuryDonutChart
                    title={charts.donutTitle}
                    subtitle="Interactive distribution view"
                    data={charts.donut}
                    centerLabel="Items"
                    centerValue={charts.donut.reduce((s, r) => s + Number(r.value || 0), 0)}
                  />
                  <LuxuryBarChart
                    title={charts.barTitle}
                    subtitle="Comparative breakdown"
                    data={charts.bars}
                    layout={charts.bars.length > 6 ? 'horizontal' : 'vertical'}
                    height={charts.bars.length > 6 ? 340 : 300}
                  />
                  <LuxuryAreaChart
                    title={charts.areaTitle}
                    subtitle="Trend-style visualization of the same cohort"
                    data={charts.area}
                    className="lg:col-span-2"
                    color="#D27918"
                  />
                </div>
              ) : null}

              <ReportSection section={reportToSection(report)} />
            </div>
          ) : null}
        </PlacementPageBody>
      </PlacementPageStack>
    </PlacementShell>
  )
}
