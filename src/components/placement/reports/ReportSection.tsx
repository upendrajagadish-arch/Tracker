import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ReportTable } from '@/components/placement/reports/ReportTable'

export interface ReportSectionData {
  title: string
  type?: 'table' | 'json'
  columns?: string[]
  rows?: (string | number | null | undefined)[][]
  data?: Record<string, unknown>
}

export function ReportSection({ section }: { section?: ReportSectionData | null }) {
  if (!section) return null

  return (
    <Card className="overflow-hidden term-window border-border bg-card/80">
      <CardHeader className="border-b border-border py-3">
        <CardTitle className="text-sm font-semibold text-foreground">{section.title}</CardTitle>
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
