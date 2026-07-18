import { useState, type ReactNode } from 'react'
import { Cell, Pie, PieChart, Sector, Tooltip } from 'recharts'
import { ChartPanel, MeasuredChart } from '@/components/placement/charts/ChartShell'
import {
  CHART_AXIS,
  chartTotal,
  withChartColors,
  type ChartDatum,
} from '@/components/placement/charts/chartTheme'
import { cn } from '@/lib/utils'
import { ChartDataDialog } from '@/components/placement/charts/ChartDataDialog'

interface ActiveShapeProps {
  cx?: number
  cy?: number
  innerRadius?: number
  outerRadius?: number
  startAngle?: number
  endAngle?: number
  fill?: string
}

/** Hovered slice pops out with a glowing halo ring. */
function ActiveSlice(props: ActiveShapeProps) {
  const {
    cx = 0,
    cy = 0,
    innerRadius = 0,
    outerRadius = 0,
    startAngle = 0,
    endAngle = 0,
    fill = '#D27918',
  } = props
  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        stroke="rgba(11,14,17,0.65)"
        strokeWidth={2}
        style={{ filter: `drop-shadow(0 0 16px ${fill})` }}
      />
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={outerRadius + 12}
        outerRadius={outerRadius + 15}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={0.55}
      />
    </g>
  )
}

function DonutTooltip({
  active,
  payload,
  total,
}: {
  active?: boolean
  payload?: Array<{ name?: string; value?: number; payload?: ChartDatum }>
  total: number
}) {
  if (!active || !payload?.length) return null
  const row = payload[0]
  const value = Number(row.value ?? 0)
  const pct = total ? Math.round((value / total) * 100) : 0
  const color = row.payload?.color ?? '#D27918'
  return (
    <div
      className="rounded-lg border px-3.5 py-2.5 text-[12px] shadow-2xl backdrop-blur"
      style={{
        background: 'rgba(30,35,41,0.96)',
        borderColor: `${color}66`,
        color: CHART_AXIS.tooltipText,
        boxShadow: `0 0 24px ${color}33, 0 12px 32px -12px rgba(0,0,0,0.8)`,
      }}
    >
      <div className="flex items-center gap-2">
        <span className="size-2 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
        <p className="font-semibold">{row.name}</p>
      </div>
      <p className="tnum mt-1 text-[18px] font-bold" style={{ color }}>
        {value}
      </p>
      <p className="tnum mt-0.5 text-[11px] text-secondary">{pct}% of total</p>
    </div>
  )
}

export function LuxuryDonutChart({
  title,
  subtitle,
  data,
  height = 280,
  centerLabel,
  centerValue,
  className,
  onSliceClick,
  actions,
  hideLegend = false,
}: {
  title: string
  subtitle?: string
  data: ChartDatum[]
  height?: number
  centerLabel?: string
  centerValue?: string | number
  className?: string
  onSliceClick?: (name: string) => void
  actions?: ReactNode
  hideLegend?: boolean
}) {
  const colored = withChartColors(data.filter((d) => Number(d.value) > 0))
  const total = chartTotal(colored)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  const activeRow = activeIndex != null ? colored[activeIndex] : null
  const displayCenter = activeRow ? activeRow.value : (centerValue ?? total)
  const displayLabel = activeRow ? activeRow.name : centerLabel

  return (
    <ChartPanel
      title={title}
      subtitle={subtitle}
      className={className}
      actions={
        <div className="flex items-center gap-1">
          {actions}
          <ChartDataDialog title={title} data={colored} />
        </div>
      }
    >
      {colored.length === 0 ? (
        <p className="py-16 text-center text-sm text-secondary">No data to chart</p>
      ) : (
        <div
          className={cn(
            'grid gap-4 lg:items-center',
            hideLegend ? 'grid-cols-1 place-items-center' : 'lg:grid-cols-[1.2fr_0.8fr]',
          )}
        >
          <MeasuredChart height={height} className={hideLegend ? 'w-full max-w-[280px]' : undefined}>
            {(width) => (
              <div className="relative">
                <PieChart width={width} height={height}>
                  <Pie
                    data={colored}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={Math.min(width, height) * 0.28}
                    outerRadius={Math.min(width, height) * 0.4}
                    paddingAngle={3}
                    cornerRadius={6}
                    stroke="rgba(11,14,17,0.65)"
                    strokeWidth={2}
                    animationDuration={900}
                    animationEasing="ease-out"
                    activeIndex={activeIndex ?? undefined}
                    activeShape={<ActiveSlice />}
                    onMouseEnter={(_, index) => setActiveIndex(index)}
                    onMouseLeave={() => setActiveIndex(null)}
                    onClick={(entry) => {
                      if (entry?.name && onSliceClick) onSliceClick(String(entry.name))
                    }}
                    style={{ cursor: onSliceClick ? 'pointer' : 'default' }}
                  >
                    {colored.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={entry.color}
                        fillOpacity={activeIndex == null || activeIndex === index ? 1 : 0.35}
                        style={{
                          filter: `drop-shadow(0 0 10px ${entry.color}55)`,
                          transition: 'fill-opacity 200ms ease',
                        }}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<DonutTooltip total={total} />} />
                </PieChart>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <p
                    className="tnum text-[28px] font-bold tracking-tight transition-colors"
                    style={{ color: activeRow?.color ?? '#D27918' }}
                  >
                    {displayCenter}
                  </p>
                  {displayLabel ? (
                    <p className="mt-0.5 max-w-[120px] truncate text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-secondary">
                      {displayLabel}
                    </p>
                  ) : null}
                </div>
              </div>
            )}
          </MeasuredChart>

          {hideLegend ? null : (
          <ul className="space-y-2.5">
            {colored.map((row, index) => {
              const pct = total ? Math.round((Number(row.value) / total) * 100) : 0
              const isActive = activeIndex === index
              return (
                <li key={row.name}>
                  <button
                    type="button"
                    className={cn(
                      'flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left transition-all duration-200',
                      isActive && 'translate-x-1 bg-elevated/70',
                      onSliceClick ? 'hover:bg-elevated/60' : 'cursor-default',
                    )}
                    onMouseEnter={() => setActiveIndex(index)}
                    onMouseLeave={() => setActiveIndex(null)}
                    onClick={() => onSliceClick?.(row.name)}
                    disabled={!onSliceClick}
                  >
                    <span
                      className="size-2.5 shrink-0 rounded-full transition-transform duration-200"
                      style={{
                        background: row.color,
                        color: row.color,
                        boxShadow: isActive ? `0 0 14px ${row.color}` : `0 0 8px ${row.color}88`,
                        transform: isActive ? 'scale(1.4)' : undefined,
                      }}
                    />
                    <span className="min-w-0 flex-1 truncate text-[13px] text-foreground">
                      {row.name}
                    </span>
                    <span
                      className="tnum text-[13px] font-semibold transition-colors"
                      style={{ color: isActive ? row.color : '#D27918' }}
                    >
                      {row.value}
                    </span>
                    <span className="tnum w-10 text-right text-[11px] text-secondary">{pct}%</span>
                  </button>
                </li>
              )
            })}
          </ul>
          )}
        </div>
      )}
    </ChartPanel>
  )
}
