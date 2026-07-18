/** Shared palette for placement luxury charts — aligned with Binance/Ramachandra theme. */
export const CHART_PALETTE = [
  '#D27918',
  '#E08A2A',
  '#B56614',
  '#F09A3E',
  '#9A5810',
  '#C96D12',
  '#F3AE68',
  '#7E460C',
  '#D98A3D',
  '#AD6418',
] as const

export const BADGE_CHART_COLORS = {
  gold: '#F0B90B',
  silver: '#C0C7D1',
  bronze: '#CD7F32',
} as const

export const CHART_AXIS = {
  stroke: 'rgba(146, 154, 165, 0.45)',
  tick: '#929AA5',
  grid: 'rgba(41, 46, 53, 0.9)',
  tooltipBg: '#111418',
  tooltipBorder: '#292E35',
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
