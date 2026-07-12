import { PlacementStatCard } from '@/components/placement/PlacementStates'
import { Card, CardContent } from '@/components/ui/card'

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

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {summary.map((card) => (
        <PlacementStatCard key={card.label} label={card.label} value={card.value ?? '—'} />
      ))}
    </div>
  )
}
