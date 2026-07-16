/** Shared palette for placement luxury charts — aligned with Binance/Ramachandra theme. */
export const CHART_PALETTE = [
  '#D27918', // brand gold
  '#F0B90B', // bright gold
  '#0ECB81', // success green
  '#3B82F6', // blue
  '#A78BFA', // soft violet
  '#F6465D', // coral red
  '#22D3EE', // cyan
  '#FB923C', // soft orange
  '#84CC16', // lime
  '#E879F9', // magenta
] as const

export const BADGE_CHART_COLORS = {
  gold: '#F0B90B',
  silver: '#C0C7D1',
  bronze: '#CD7F32',
} as const

export const CHART_AXIS = {
  stroke: 'rgba(146, 154, 165, 0.45)',
  tick: '#929AA5',
  grid: 'rgba(43, 49, 57, 0.9)',
  tooltipBg: '#1E2329',
  tooltipBorder: '#2B3139',
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
