import { useEffect, useState } from 'react'

interface Diff {
  label: string
  solved: number
  total: number
  color: string
}

/** Three joined difficulty tiles (Easy / Medium / Hard) with a mini progress
 *  bar under each figure. Replaces the loose centered columns on the
 *  LeetCode / HackerRank problem breakdown sections. */
export function DifficultyBreakdown({ easy, medium, hard }: { easy: Diff; medium: Diff; hard: Diff }) {
  const tiles = [easy, medium, hard]
  const [mounted, setMounted] = useState(false)
  useEffect(() => { const t = setTimeout(() => setMounted(true), 16); return () => clearTimeout(t) }, [])

  return (
    <div className="grid grid-cols-3 gap-3">
      {tiles.map((d) => {
        const pct = d.total > 0 ? (d.solved / d.total) * 100 : 0
        return (
          <div key={d.label} className="tile flex flex-col items-center gap-2 px-3 py-4 text-center">
            <span className="font-serif text-3xl font-light leading-none" style={{ color: d.color }}>
              {d.solved}
            </span>
            <span
              className="rounded-full border px-2 py-0.5 text-[10px] font-mono uppercase tracking-[0.15em]"
              style={{ color: d.color, borderColor: `color-mix(in srgb, ${d.color} 30%, transparent)` }}
            >
              {d.label}
            </span>
            <span className="text-[10px] font-mono text-muted-foreground/60">
              of {d.total}
            </span>
            <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-secondary/70">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{ width: mounted ? `${pct}%` : '0%', background: d.color }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
