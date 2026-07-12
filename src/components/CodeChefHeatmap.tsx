import { UniversalHeatmap } from './UniversalHeatmap'
import type { CodeChefHeatmapEntry } from '../types/api'

interface Props {
  heatmap: CodeChefHeatmapEntry[]
}

export function CodeChefHeatmap({ heatmap }: Props) {
  const calendar: Record<string, number> = {}
  
  heatmap.forEach(entry => {
    const parts = entry.date.split('-')
    if (parts.length === 3) {
      const yyyy = parts[0]
      const mm = parts[1].padStart(2, '0')
      const dd = parts[2].padStart(2, '0')
      calendar[`${yyyy}-${mm}-${dd}`] = entry.value
    }
  })

  return <UniversalHeatmap calendar={calendar} label="submissions" />
}
