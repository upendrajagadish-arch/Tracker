import type { PlacementReportType, ReportResult } from '@/lib/placementReports'
import type { ChartDatum } from '@/components/placement/charts'

function num(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function str(value: unknown, fallback = 'Unknown'): string {
  const s = String(value ?? '').trim()
  return s || fallback
}

/** Derive chart series from generated report rows for luxury Analytics visuals. */
export function reportToCharts(report: ReportResult): {
  donut: ChartDatum[]
  bars: ChartDatum[]
  donutTitle: string
  barTitle: string
  area: ChartDatum[]
  areaTitle: string
} {
  const type: PlacementReportType = report.reportType
  const rows = report.rows

  switch (type) {
    case 'branch-summary': {
      const bars = rows.map((row) => ({
        name: str(row.branch),
        value: num(row.studentCount),
      }))
      const donut = rows.map((row) => ({
        name: str(row.branch),
        value: num(row.placedCount),
      }))
      const area = rows.map((row) => ({
        name: str(row.branch),
        value: num(row.averageReadiness),
      }))
      return {
        bars,
        donut,
        area,
        barTitle: 'Students by branch',
        donutTitle: 'Placed students by branch',
        areaTitle: 'Average readiness by branch',
      }
    }
    case 'batch-summary': {
      const bars = rows.map((row) => ({
        name: str(row.batch),
        value: num(row.studentCount),
      }))
      const area = rows.map((row) => ({
        name: str(row.batch),
        value: num(row.averageReadiness),
      }))
      return {
        bars,
        donut: bars,
        area,
        barTitle: 'Students by batch',
        donutTitle: 'Batch distribution',
        areaTitle: 'Average readiness by batch',
      }
    }
    case 'readiness-overview': {
      const donut = rows.map((row) => ({
        name: str(row.readinessStatus),
        value: num(row.count),
      }))
      return {
        donut,
        bars: donut,
        area: donut,
        donutTitle: 'Readiness status mix',
        barTitle: 'Readiness status counts',
        areaTitle: 'Readiness volume',
      }
    }
    case 'placement-status': {
      const donut = rows.map((row) => ({
        name: str(row.placementStatus),
        value: num(row.count),
      }))
      return {
        donut,
        bars: donut,
        area: donut,
        donutTitle: 'Placement status mix',
        barTitle: 'Placement status counts',
        areaTitle: 'Placement volume',
      }
    }
    case 'skill-gap': {
      const bars = rows.slice(0, 12).map((row) => ({
        name: str(row.skill),
        value: num(row.studentCount),
      }))
      const donut = rows.slice(0, 8).map((row) => ({
        name: str(row.skill),
        value: num(row.coveragePct),
      }))
      return {
        bars,
        donut,
        area: bars,
        barTitle: 'Students per skill',
        donutTitle: 'Skill coverage %',
        areaTitle: 'Skill demand curve',
      }
    }
    case 'resume-review': {
      const byStatus = new Map<string, number>()
      for (const row of rows) {
        const key = str(row.reviewStatus ?? row.status ?? 'Unknown')
        byStatus.set(key, (byStatus.get(key) ?? 0) + 1)
      }
      const donut = [...byStatus.entries()].map(([name, value]) => ({ name, value }))
      return {
        donut,
        bars: donut,
        area: donut,
        donutTitle: 'Resume review status',
        barTitle: 'Resume review counts',
        areaTitle: 'Review volume',
      }
    }
    case 'company-pipeline': {
      const bars = rows.map((row) => ({
        name: str(row.companyName ?? row.requirementTitle ?? row.requirementId),
        value: num(row.totalMatches ?? row.matchCount ?? row.studentCount),
      }))
      return {
        bars,
        donut: bars.slice(0, 8),
        area: bars,
        barTitle: 'Matches by requirement',
        donutTitle: 'Pipeline share',
        areaTitle: 'Pipeline volume',
      }
    }
    default:
      return {
        donut: [],
        bars: [],
        area: [],
        donutTitle: 'Distribution',
        barTitle: 'Breakdown',
        areaTitle: 'Trend',
      }
  }
}
