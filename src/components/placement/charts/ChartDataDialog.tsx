import { useEffect, useRef, useState } from 'react'
import { List, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ChartDatum } from '@/components/placement/charts/chartTheme'

export function ChartDataDialog({
  title,
  data,
}: {
  title: string
  data: ChartDatum[]
}) {
  const [open, setOpen] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    const trigger = triggerRef.current
    document.body.style.overflow = 'hidden'
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
      if (event.key === 'Tab') {
        const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]),a[href],[tabindex]:not([tabindex="-1"])',
        )
        if (!focusable?.length) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }
    window.addEventListener('keydown', close)
    requestAnimationFrame(() => dialogRef.current?.querySelector<HTMLElement>('button')?.focus())
    return () => {
      window.removeEventListener('keydown', close)
      document.body.style.overflow = previousOverflow
      trigger?.focus()
    }
  }, [open])

  return (
    <>
      <Button ref={triggerRef} type="button" variant="ghost" size="sm" className="text-primary" onClick={() => setOpen(true)}>
        <List className="size-3.5" />
        View data
      </Button>
      {open ? (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={`${title} data`}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false)
          }}
        >
          <div ref={dialogRef} className="flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-primary/35 bg-[#0B0E11] shadow-[0_0_55px_-22px_rgba(210,121,24,0.9)]">
            <div className="flex items-center gap-3 border-b border-border px-4 py-3">
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-bold">{title}</h3>
                <p className="text-xs text-muted-foreground">{data.length} chart values</p>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close chart data">
                <X className="size-4" />
              </Button>
            </div>
            <div className="min-h-0 overflow-y-auto p-3">
              {data.map((row, index) => (
                <div key={`${row.name}-${index}`} className="flex items-center gap-3 border-b border-border/70 px-2 py-3 last:border-0">
                  <span className="size-2.5 rounded-full bg-primary shadow-[0_0_10px_rgba(210,121,24,0.8)]" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{row.name}</span>
                  <span className="tnum text-sm font-bold text-primary">{Number(row.value ?? 0)}</span>
                </div>
              ))}
              {!data.length ? <p className="py-8 text-center text-sm text-muted-foreground">No chart data.</p> : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

