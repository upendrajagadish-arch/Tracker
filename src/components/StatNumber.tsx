import { useCountUp } from '@/hooks/useCountUp'
import { cn } from '@/lib/utils'

interface Props {
  value: number
  label: string
  prefix?: string
  suffix?: string
  enabled?: boolean
  size?: 'sm' | 'md' | 'lg'
  /** Optional brand/accent color for the figure (CSS color). */
  accent?: string
}

export function StatNumber({ value, label, prefix = '', suffix = '', enabled = true, size = 'md', accent }: Props) {
  const display = useCountUp(value, 1200, enabled)

  const numClass = { sm: 'text-2xl', md: 'text-3xl', lg: 'text-[2.6rem]' }[size]
  // Headline figures (md/lg) wear the Geist Pixel scoreboard face; small,
  // dense figures stay in the grotesk with tabular alignment for legibility.
  const figureFont =
    size === 'sm'
      ? 'font-sans font-medium tabular-nums tracking-tight'
      : 'font-pixel tracking-normal'

  return (
    <div className="flex flex-col gap-1.5">
      <span
        className={cn('leading-none', figureFont, numClass)}
        style={accent ? { color: accent } : { color: 'var(--color-foreground)' }}
      >
        {prefix}{display.toLocaleString()}{suffix}
      </span>
      <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </span>
    </div>
  )
}
