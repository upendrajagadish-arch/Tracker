import { cn } from '@/lib/utils'
import { BRAND_NAME } from '@/lib/brand'

export function AppFooter({ className }: { className?: string }) {
  return (
    <footer className={cn('mt-16 border-t-2 border-console pt-6 text-center text-xs font-semibold uppercase tracking-[0.5px] text-secondary', className)}>
      <p>
        &copy; {new Date().getFullYear()} {BRAND_NAME} · all stats compiled dynamically
      </p>
    </footer>
  )
}
