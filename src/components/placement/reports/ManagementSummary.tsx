import { ReportSummaryCards, type ReportSummaryItem } from '@/components/placement/reports/ReportSummaryCards'
import { ReportSection, type ReportSectionData } from '@/components/placement/reports/ReportSection'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export interface ManagementSummaryReport {
  generatedAt?: string
  summary?: ReportSummaryItem[]
  overview?: Record<string, ReportSummaryItem[]>
  keyGaps?: string[]
  recommendedActions?: string[]
  sections?: ReportSectionData[]
}

export function ManagementSummary({
  report,
  printMode = false,
}: {
  report?: ManagementSummaryReport | null
  printMode?: boolean
}) {
  if (!report) return null

  return (
    <div className={`space-y-8 ${printMode ? 'print-summary bg-card text-black' : ''}`}>
      <div>
        <h2 className="text-lg font-semibold text-foreground print:text-black">Executive Summary</h2>
        <p className="mt-1 text-xs text-muted-foreground print:text-muted-foreground">
          Generated {report.generatedAt ? new Date(report.generatedAt).toLocaleString() : '—'}
        </p>
        <div className="mt-4">
          <ReportSummaryCards summary={report.summary} />
        </div>
      </div>

      {report.overview ? (
        <div className="grid gap-6 lg:grid-cols-2">
          {Object.entries(report.overview).map(([key, cards]) => (
            <Card key={key} className="border-border bg-card">
              <CardHeader className="border-b border-border py-3">
                <CardTitle className="text-sm font-semibold capitalize text-foreground">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-0 pt-0">
                <ul className="divide-y divide-border px-4 py-2 text-sm">
                  {(cards || []).map((c) => (
                    <li key={c.label} className="flex justify-between py-2">
                      <span className="text-muted-foreground">{c.label}</span>
                      <span className="font-medium text-foreground">{c.value ?? '—'}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {report.keyGaps && report.keyGaps.length > 0 ? (
        <Card className="border-[var(--term-amber)]/30 bg-[var(--term-amber)]/10">
          <CardHeader className="border-b border-primary/30 py-3">
            <CardTitle className="text-sm font-semibold text-[var(--term-amber)]">Key Gaps</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1 px-4 py-2 text-sm text-[var(--term-amber)]">
              {report.keyGaps.map((gap) => (
                <li key={gap}>{gap}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {report.recommendedActions && report.recommendedActions.length > 0 ? (
        <Card className="border-primary/30 bg-primary/10">
          <CardHeader className="border-b border-emerald-200 py-3">
            <CardTitle className="text-sm font-semibold text-primary">Recommended Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1 px-4 py-2 text-sm text-primary">
              {report.recommendedActions.map((action) => (
                <li key={action}>{action}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <div className="space-y-6">
        {(report.sections || []).map((section) => (
          <ReportSection key={section.title} section={section} />
        ))}
      </div>
    </div>
  )
}
