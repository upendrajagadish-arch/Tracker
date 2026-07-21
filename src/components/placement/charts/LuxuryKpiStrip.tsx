import { cn } from '@/lib/utils'
import { ChartDataDialog } from '@/components/placement/charts/ChartDataDialog'
import { SectionExportActions } from '@/components/placement/SectionExportActions'
import { chartDataSectionExport } from '@/lib/analyticsExports'

/** Compact KPI strip that sits above chart grids on luxury dashboards. */
export function LuxuryKpiStrip({
  items,
  className,
}: {
  items: Array<{ label: string; value: string | number; hint?: string }>
  className?: string
}) {
  if (!items.length) return null
  const stripExport = chartDataSectionExport(
    'KPI summary',
    items.map((item) => ({
      name: item.label,
      value: Number.parseFloat(String(item.value)) || 0,
    })),
  )
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <SectionExportActions section={stripExport} size="xs" />
      </div>
      <div className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4', className)}>
        {items.map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-soft bg-gradient-to-br from-card via-card to-[#D27918]/[0.08] p-4 shadow-[0_0_0_1px_rgba(210,121,24,0.05)]"
          >
            <div className="mb-2 flex items-start justify-between gap-2">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-secondary">{item.label}</p>
              <ChartDataDialog
                title={item.label}
                data={[{ name: item.hint || item.label, value: Number.parseFloat(String(item.value)) || 0 }]}
              />
            </div>
            <p className="tnum text-[28px] font-bold tracking-tight text-foreground">{item.value}</p>
            {item.hint ? <p className="mt-1 text-[11px] text-muted">{item.hint}</p> : null}
          </div>
        ))}
      </div>
    </div>
  )
}
