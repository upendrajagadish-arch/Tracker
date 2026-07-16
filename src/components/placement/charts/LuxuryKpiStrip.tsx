import { PlacementStatCard } from '@/components/placement/PlacementStates'
import { cn } from '@/lib/utils'

/** Compact KPI strip that sits above chart grids on luxury dashboards. */
export function LuxuryKpiStrip({
  items,
  className,
}: {
  items: Array<{ label: string; value: string | number; hint?: string }>
  className?: string
}) {
  if (!items.length) return null
  return (
    <div className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4', className)}>
      {items.map((item) => (
        <PlacementStatCard
          key={item.label}
          label={item.label}
          value={item.value}
          hint={item.hint}
          className="border-soft bg-gradient-to-br from-card via-card to-[#D27918]/[0.07] shadow-[0_0_0_1px_rgba(210,121,24,0.05)]"
        />
      ))}
    </div>
  )
}
