import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { CollegeLogo } from '@/components/CollegeBrand'
import { TNP_CELL } from '@/lib/brand'

interface AppFrameProps {
  children: ReactNode
  className?: string
}

/**
 * Global page outline — every route sits inside a bordered workspace
 * with college mark + Training & Placement Cell at the top-left.
 */
export function AppFrame({ children, className }: AppFrameProps) {
  return (
    <div className="min-h-screen bg-canvas p-3 sm:p-4 md:p-5">
      <div
        className={cn(
          'app-frame mx-auto flex min-h-[calc(100vh-1.5rem)] w-full max-w-[1440px] flex-col overflow-x-hidden rounded-card border border-soft bg-canvas sm:min-h-[calc(100vh-2rem)] md:min-h-[calc(100vh-2.5rem)]',
          className,
        )}
      >
        <div className="flex shrink-0 items-center gap-3 border-b border-soft/70 bg-card/40 px-3 py-2 sm:gap-4 sm:px-4">
          <CollegeLogo height={36} />
          <div className="min-w-0">
            <p className="truncate text-[11px] font-semibold uppercase tracking-[0.16em] text-binance sm:text-[12px]">
              {TNP_CELL}
            </p>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </div>
    </div>
  )
}

/** Inner content rail with consistent horizontal padding. */
export function AppContent({ children, className }: AppFrameProps) {
  return (
    <div className={cn('mx-auto w-full max-w-[1280px] flex-1 px-4 py-5 sm:px-6 sm:py-6 md:px-8', className)}>
      {children}
    </div>
  )
}

/** Vertical stack with clear gaps between bordered modules. */
export function AppStack({ children, className }: AppFrameProps) {
  return <div className={cn('flex flex-col gap-6', className)}>{children}</div>
}

/** Bordered module surface for toolbars / section groups. */
export function AppPanel({ children, className }: AppFrameProps) {
  return (
    <div className={cn('rounded-card border border-soft bg-card p-4 sm:p-5 md:p-6', className)}>
      {children}
    </div>
  )
}
