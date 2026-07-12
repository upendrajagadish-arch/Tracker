import { requireSupabase } from '@/lib/supabase'
import { logPlacementAudit } from '@/lib/placementAudit'
import {
  buildManagementSummary,
  buildPlacementReport,
  reportToCsv,
  type PlacementReportType,
  type ReportFilters,
  type ReportResult,
  type ManagementSummary,
} from '@/lib/placementReports'

export type { PlacementReportType, ReportFilters, ReportResult, ManagementSummary }

export async function getReport(reportType: PlacementReportType, filters: ReportFilters = {}): Promise<ReportResult> {
  const client = requireSupabase()
  return buildPlacementReport(client, reportType, filters)
}

export async function getManagementSummary(): Promise<ManagementSummary> {
  const client = requireSupabase()
  return buildManagementSummary(client)
}

export async function exportReportCsv(reportType: PlacementReportType, filters: ReportFilters = {}): Promise<string> {
  const report = await getReport(reportType, filters)
  const csv = reportToCsv(report)

  await logPlacementAudit({
    action: 'report.export_csv',
    entityType: 'report',
    entityId: reportType,
    description: `Exported ${reportType} report to CSV`,
    metadata: { rowCount: report.rows.length, filters },
  })

  return csv
}
