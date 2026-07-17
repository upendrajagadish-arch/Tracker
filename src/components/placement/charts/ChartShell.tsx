import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

/** ResizeObserver-based sizing — avoids recharts ResponsiveContainer React 19 blank charts. */
export function MeasuredChart({
  height,
  children,
  className,
}: {
  height: number
  children: (width: number) => ReactNode
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = (w: number) => {
      if (w > 0) setWidth(w)
    }
    update(el.getBoundingClientRect().width)
    const ro = new ResizeObserver((entries) => update(entries[0]?.contentRect.width ?? 0))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div ref={ref} className={cn('w-full', className)} style={{ height }}>
      {width > 0 ? children(width) : null}
    </div>
  )
}

export function ChartPanel({
  title,
  subtitle,
  children,
  className,
  actions,
}: {
  title: string
  subtitle?: string
  children: ReactNode
  className?: string
  actions?: ReactNode
}) {
  return (
    <Card
      className={cn(
        'relative overflow-hidden border-soft bg-card shadow-[0_0_0_1px_rgba(210,121,24,0.06),0_18px_40px_-28px_rgba(0,0,0,0.75)]',
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#D27918]/55 to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-20 size-44 rounded-full bg-[#D27918]/8 blur-3xl"
      />
      <CardContent className="relative flex h-full flex-col pt-1">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="font-heading text-[15px] font-semibold tracking-tight text-foreground">
              {title}
            </h3>
            {subtitle ? (
              <p className="mt-1 text-[12px] leading-relaxed text-secondary">{subtitle}</p>
            ) : null}
          </div>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>
        {children}
      </CardContent>
    </Card>
  )
}
