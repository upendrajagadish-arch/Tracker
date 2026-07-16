import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChartPanel, MeasuredChart } from '@/components/placement/charts/ChartShell'
import {
  CHART_AXIS,
  withChartColors,
  type ChartDatum,
} from '@/components/placement/charts/chartTheme'

function BarTooltip({
  active,
  payload,
  label,
  total,
}: {
  active?: boolean
  payload?: Array<{ value?: number; payload?: ChartDatum }>
  label?: string
  total: number
}) {
  if (!active || !payload?.length) return null
  const value = Number(payload[0]?.value ?? 0)
  const color = payload[0]?.payload?.color ?? '#D27918'
  const pct = total ? Math.round((value / total) * 100) : 0
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
        <p className="font-semibold">{label}</p>
      </div>
      <p className="tnum mt-1 text-[18px] font-bold" style={{ color }}>
        {value}
      </p>
      <p className="tnum mt-0.5 text-[11px] text-secondary">{pct}% of series total</p>
    </div>
  )
}

export function LuxuryBarChart({
  title,
  subtitle,
  data,
  height = 300,
  layout = 'vertical',
  valueKey = 'value',
  className,
}: {
  title: string
  subtitle?: string
  data: ChartDatum[]
  height?: number
  layout?: 'vertical' | 'horizontal'
  valueKey?: string
  className?: string
}) {
  const colored = withChartColors(data)
  const isHorizontal = layout === 'horizontal'
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const total = useMemo(
    () => colored.reduce((sum, row) => sum + (Number(row[valueKey]) || 0), 0),
    [colored, valueKey],
  )

  const gradientPrefix = `lux-bar-${title.replace(/\s+/g, '-').toLowerCase()}`

  const cells = colored.map((entry, index) => {
    const isActive = activeIndex === index
    const dimmed = activeIndex != null && !isActive
    return (
      <Cell
        key={entry.name}
        fill={`url(#${gradientPrefix}-${index})`}
        fillOpacity={dimmed ? 0.3 : 1}
        stroke={isActive ? entry.color : 'transparent'}
        strokeWidth={isActive ? 1.5 : 0}
        style={{
          filter: isActive ? `drop-shadow(0 0 12px ${entry.color})` : `drop-shadow(0 0 6px ${entry.color}44)`,
          transition: 'fill-opacity 200ms ease',
        }}
      />
    )
  })

  const gradients = (
    <defs>
      {colored.map((entry, index) => (
        <linearGradient
          key={entry.name}
          id={`${gradientPrefix}-${index}`}
          x1="0"
          y1={isHorizontal ? '0' : '0'}
          x2={isHorizontal ? '1' : '0'}
          y2={isHorizontal ? '0' : '1'}
        >
          <stop offset="0%" stopColor={entry.color} stopOpacity={1} />
          <stop offset="100%" stopColor={entry.color} stopOpacity={0.45} />
        </linearGradient>
      ))}
    </defs>
  )

  const sharedBarProps = {
    animationDuration: 900,
    animationEasing: 'ease-out' as const,
    onMouseEnter: (_: unknown, index: number) => setActiveIndex(index),
    onMouseLeave: () => setActiveIndex(null),
  }

  return (
    <ChartPanel title={title} subtitle={subtitle} className={className}>
      {colored.length === 0 ? (
        <p className="py-16 text-center text-sm text-secondary">No data to chart</p>
      ) : (
        <MeasuredChart height={height}>
          {(width) =>
            isHorizontal ? (
              <BarChart
                width={width}
                height={height}
                data={colored}
                layout="vertical"
                margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
              >
                {gradients}
                <CartesianGrid stroke={CHART_AXIS.grid} horizontal={false} />
                <XAxis
                  type="number"
                  stroke={CHART_AXIS.stroke}
                  tick={{ fill: CHART_AXIS.tick, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={88}
                  stroke={CHART_AXIS.stroke}
                  tick={{ fill: CHART_AXIS.tick, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(210,121,24,0.08)' }}
                  content={<BarTooltip total={total} />}
                />
                <Bar dataKey={valueKey} radius={[0, 8, 8, 0]} barSize={18} {...sharedBarProps}>
                  {cells}
                </Bar>
              </BarChart>
            ) : (
              <BarChart
                width={width}
                height={height}
                data={colored}
                margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
              >
                {gradients}
                <CartesianGrid stroke={CHART_AXIS.grid} vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke={CHART_AXIS.stroke}
                  tick={{ fill: CHART_AXIS.tick, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                  angle={colored.length > 6 ? -28 : 0}
                  textAnchor={colored.length > 6 ? 'end' : 'middle'}
                  height={colored.length > 6 ? 64 : 30}
                />
                <YAxis
                  stroke={CHART_AXIS.stroke}
                  tick={{ fill: CHART_AXIS.tick, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(210,121,24,0.08)' }}
                  content={<BarTooltip total={total} />}
                />
                <Bar dataKey={valueKey} radius={[8, 8, 0, 0]} barSize={28} {...sharedBarProps}>
                  {cells}
                </Bar>
              </BarChart>
            )
          }
        </MeasuredChart>
      )}
    </ChartPanel>
  )
}
