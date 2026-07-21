import { PlacementStatCard } from '@/components/placement/PlacementStates'
import { SectionExportActions } from '@/components/placement/SectionExportActions'
import { Card, CardContent } from '@/components/ui/card'
import { tableSectionExport } from '@/lib/analyticsExports'

export interface ReportSummaryItem {
  label: string
  value?: string | number | null
}

export function ReportSummaryCards({ summary = [] }: { summary?: ReportSummaryItem[] }) {
  if (!summary.length) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No summary data available.
        </CardContent>
      </Card>
    )
  }

  const exportSection = tableSectionExport(
    'Report summary',
    ['Metric', 'Value'],
    summary.map((card) => [card.label, String(card.value ?? '—')]),
    { fileBase: 'report_summary' },
  )

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <SectionExportActions section={exportSection} size="xs" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {summary.map((card) => (
          <PlacementStatCard
            key={card.label}
            label={card.label}
            value={card.value ?? '—'}
            className="border-soft bg-gradient-to-br from-card via-card to-[#D27918]/[0.07] shadow-[0_0_0_1px_rgba(210,121,24,0.05)]"
          />
        ))}
      </div>
    </div>
  )
}
