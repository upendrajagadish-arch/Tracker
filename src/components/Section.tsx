import { cn } from '@/lib/utils'

/** Editorial section wrapper shared by the platform detail pages: a numbered
 *  mono microlabel with a hairline rule instead of a boxed card. The section
 *  number is rendered via a CSS counter declared on `.section-group` so it
 *  stays correct even with conditional blocks. An optional accent tints the
 *  tick that starts the rule. */
export function Section({
  title,
  accent,
  className,
  children,
}: {
  title: string
  accent?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <section className={cn('section-rise editorial-section pt-2', className)}>
      <div className="mb-5 flex items-baseline gap-3">
        <span
          className="shrink-0 font-pixel text-sm tabular-nums leading-none"
          style={{ color: accent ?? 'var(--color-primary)' }}
          aria-hidden
        />
        <h2 className="shrink-0 font-heading text-base font-semibold uppercase tracking-[0.14em] text-foreground">
          {title}
        </h2>
        <span className="relative h-px flex-1 bg-border/60">
          {accent && (
            <span
              className="absolute left-0 top-1/2 h-px w-6 -translate-y-1/2"
              style={{ background: accent }}
            />
          )}
        </span>
      </div>
      <div className="flex flex-col gap-4">
        {children}
      </div>
    </section>
  )
}

/** Wrapper that resets the CSS section counter for its children. Put every
 *  detail page body inside one of these so section numbers start at 01. */
export function SectionGroup({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('section-group flex flex-col gap-6 [counter-reset:section]', className)}>
      {children}
    </div>
  )
}
