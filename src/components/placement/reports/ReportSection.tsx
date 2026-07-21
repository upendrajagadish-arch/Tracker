import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ReportTable } from '@/components/placement/reports/ReportTable'
import { SectionExportActions } from '@/components/placement/SectionExportActions'
import { tableSectionExport } from '@/lib/analyticsExports'

export interface ReportSectionData {
  title: string
  type?: 'table' | 'json'
  columns?: string[]
  rows?: (string | number | null | undefined)[][]
  data?: Record<string, unknown>
}

export function ReportSection({ section }: { section?: ReportSectionData | null }) {
  if (!section) return null

  const columns = section.columns ?? []
  const rows = (section.rows ?? []).map((row) => row.map((cell) => (cell == null ? '' : String(cell))))
  const exportSection =
    section.type === 'table' || section.columns
      ? tableSectionExport(section.title, columns, rows, { fileBase: section.title })
      : tableSectionExport(
          section.title,
          ['Key', 'Value'],
          Object.entries(section.data || {}).map(([key, value]) => [key, String(value ?? '')]),
          { fileBase: section.title },
        )

  return (
    <Card className="overflow-hidden term-window border-border bg-card/80">
      <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-border py-3">
        <CardTitle className="text-sm font-semibold text-foreground">{section.title}</CardTitle>
        <SectionExportActions section={exportSection} size="xs" />
      </CardHeader>
      <CardContent className="pt-4">
        {section.type === 'table' || section.columns ? (
          <ReportTable columns={section.columns} rows={section.rows} />
        ) : (
          <p className="text-sm text-muted-foreground">{JSON.stringify(section.data || {})}</p>
        )}
      </CardContent>
    </Card>
  )
}
