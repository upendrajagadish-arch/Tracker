import {
  Area,
  AreaChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChartPanel, MeasuredChart } from '@/components/placement/charts/ChartShell'
import { CHART_AXIS, type ChartDatum } from '@/components/placement/charts/chartTheme'
import { ChartDataDialog } from '@/components/placement/charts/ChartDataDialog'
import { SectionExportActions } from '@/components/placement/SectionExportActions'
import { chartDataSectionExport } from '@/lib/analyticsExports'

function AreaTooltip({
  active,
  payload,
  label,
  color,
}: {
  active?: boolean
  payload?: Array<{ value?: number }>
  label?: string
  color: string
}) {
  if (!active || !payload?.length) return null
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
        {payload[0]?.value}
      </p>
    </div>
  )
}

export function LuxuryAreaChart({
  title,
  subtitle,
  data,
  height = 260,
  color = '#D27918',
  className,
}: {
  title: string
  subtitle?: string
  data: ChartDatum[]
  height?: number
  color?: string
  className?: string
}) {
  const gradientId = `lux-area-${title.replace(/\s+/g, '-').toLowerCase()}`

  return (
    <ChartPanel
      title={title}
      subtitle={subtitle}
      className={className}
      actions={
        <div className="flex items-center gap-1">
          <SectionExportActions section={chartDataSectionExport(title, data.map((row) => ({ name: row.name, value: Number(row.value ?? 0) })))} size="xs" />
          <ChartDataDialog title={title} data={data} />
        </div>
      }
    >
      {data.length === 0 ? (
        <p className="py-16 text-center text-sm text-secondary">No data to chart</p>
      ) : (
        <MeasuredChart height={height}>
          {(width) => (
            <AreaChart
              width={width}
              height={height}
              data={data}
              margin={{ top: 12, right: 12, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.5} />
                  <stop offset="60%" stopColor={color} stopOpacity={0.14} />
                  <stop offset="100%" stopColor={color} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={CHART_AXIS.grid} vertical={false} />
              <XAxis
                dataKey="name"
                stroke={CHART_AXIS.stroke}
                tick={{ fill: CHART_AXIS.tick, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                stroke={CHART_AXIS.stroke}
                tick={{ fill: CHART_AXIS.tick, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ stroke: color, strokeOpacity: 0.35, strokeDasharray: '4 4' }}
                content={<AreaTooltip color={color} />}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2.5}
                fill={`url(#${gradientId})`}
                animationDuration={1100}
                animationEasing="ease-out"
                dot={{ r: 3, fill: color, stroke: 'rgba(11,14,17,0.8)', strokeWidth: 1.5 }}
                activeDot={{
                  r: 6,
                  fill: color,
                  stroke: '#0B0E11',
                  strokeWidth: 2,
                  style: { filter: `drop-shadow(0 0 10px ${color})` },
                }}
                style={{ filter: `drop-shadow(0 0 8px ${color}66)` }}
              />
            </AreaChart>
          )}
        </MeasuredChart>
      )}
    </ChartPanel>
  )
}
