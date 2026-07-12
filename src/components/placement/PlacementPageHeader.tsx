import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PlacementPageHeaderProps {
  title: string
  description?: string
  actions?: ReactNode
  className?: string
}

export function PlacementPageHeader({ title, description, actions, className }: PlacementPageHeaderProps) {
  return (
    <div className={cn('mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between', className)}>
      <div>
        <h1 className="glow-text font-pixel text-3xl leading-tight text-foreground md:text-4xl">{title}</h1>
        {description ? (
          <p className="mt-2 max-w-2xl font-mono text-sm leading-relaxed text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}
