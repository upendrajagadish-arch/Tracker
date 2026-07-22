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
        'relative overflow-hidden border-soft bg-gradient-to-b from-[#14181E] to-[#0E1217] shadow-[0_0_0_1px_rgba(210,121,24,0.08),0_22px_50px_-30px_rgba(0,0,0,0.85)] transition duration-300 hover:shadow-[0_0_0_1px_rgba(210,121,24,0.18),0_28px_60px_-28px_rgba(210,121,24,0.25)]',
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#D27918]/70 to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-20 size-48 rounded-full bg-[#D27918]/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -left-10 size-40 rounded-full bg-[#0ECB81]/6 blur-3xl"
      />
      <CardContent className="relative flex h-full flex-col pt-1">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary/80">Analytics</p>
            <h3 className="mt-1 font-heading text-[16px] font-semibold tracking-tight text-foreground">
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
