import { cn } from '@/lib/utils'
import { BRAND_NAME } from '@/lib/brand'

/** Shared terminal footer: a shell-style copyright line with a blinking caret. */
export function AppFooter({ className }: { className?: string }) {
  return (
    <footer className={cn('mt-16 border-t border-border pt-6 font-mono text-[10px] text-muted-foreground', className)}>
      <div className="flex items-center justify-center gap-2">
        <span className="text-[var(--term-green)]">$</span>
        <span>&copy; {new Date().getFullYear()} {BRAND_NAME}.</span>
        <span>all stats compiled dynamically<span className="caret" /></span>
      </div>
    </footer>
  )
}
