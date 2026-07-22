import type { ReactNode } from 'react'
import { useRouterState } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { CollegeBrandMark } from '@/components/CollegeBrand'
import { PassOutYearFilterProvider } from '@/lib/placementYearFilter'

interface AppFrameProps {
  children: ReactNode
  className?: string
}

/**
 * Global page outline. Placement uses a full-bleed frame so the logo bar
 * and sidebar can span/align to the whole viewport.
 * Year filter provider wraps all routes so page hooks and WorkspaceTabs share state.
 */
export function AppFrame({ children, className }: AppFrameProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const isPlacement = /\/placement(\/|$)/.test(pathname)

  return (
    <PassOutYearFilterProvider>
      {isPlacement ? (
        <div className={cn('flex min-h-screen w-full flex-col bg-canvas', className)}>
          {children}
        </div>
      ) : (
        <div className="min-h-screen bg-canvas p-3 sm:p-4 md:p-5">
          <div
            className={cn(
              'app-frame mx-auto flex min-h-[calc(100vh-1.5rem)] w-full max-w-[1440px] flex-col overflow-x-hidden rounded-card border border-soft bg-canvas sm:min-h-[calc(100vh-2rem)] md:min-h-[calc(100vh-2.5rem)]',
              className,
            )}
          >
            <div className="flex shrink-0 items-center border-b border-soft/70 bg-card/40 px-3 py-2.5 sm:px-4 sm:py-3">
              <CollegeBrandMark size="md" framed className="min-w-0" />
            </div>
            <div className="flex min-h-0 flex-1 flex-col">{children}</div>
          </div>
        </div>
      )}
    </PassOutYearFilterProvider>
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
