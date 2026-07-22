/** Shared palette for placement charts — amber/graphite professional theme. */
export const CHART_PALETTE = [
  '#D27918',
  '#0ECB81',
  '#3B82F6',
  '#F0B90B',
  '#E08A2A',
  '#14B8A6',
  '#F6465D',
  '#94A3B8',
  '#B56614',
  '#38BDF8',
] as const

export const BADGE_CHART_COLORS = {
  gold: '#F0B90B',
  silver: '#C0C7D1',
  bronze: '#CD7F32',
  poor: '#F6465D',
} as const

export const CHART_AXIS = {
  stroke: 'rgba(146, 154, 165, 0.35)',
  tick: '#A7B0BC',
  grid: 'rgba(41, 46, 53, 0.75)',
  tooltipBg: 'rgba(17, 20, 24, 0.96)',
  tooltipBorder: 'rgba(210, 121, 24, 0.35)',
  tooltipText: '#EAECEF',
} as const

export interface ChartDatum {
  name: string
  value: number
  color?: string
  [key: string]: string | number | undefined
}

export function withChartColors(data: ChartDatum[]): ChartDatum[] {
  return data.map((item, index) => ({
    ...item,
    color: item.color ?? CHART_PALETTE[index % CHART_PALETTE.length],
  }))
}

export function chartTotal(data: ChartDatum[]): number {
  return data.reduce((sum, row) => sum + (Number(row.value) || 0), 0)
}
