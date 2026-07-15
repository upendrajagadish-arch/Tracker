import { cn } from '@/lib/utils'
import { BRAND_NAME } from '@/lib/brand'

export function AppFooter({ className }: { className?: string }) {
  return (
    <footer className={cn('mt-10 border-t border-soft pt-6 text-center text-[12px] text-muted', className)}>
      <p>
        &copy; {new Date().getFullYear()} {BRAND_NAME}. All stats compiled dynamically.
      </p>
    </footer>
  )
}
