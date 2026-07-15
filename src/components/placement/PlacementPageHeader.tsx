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
    <div className={cn('mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between', className)}>
      <div className="max-w-2xl">
        <h1 className="font-heading text-3xl tracking-tight text-foreground md:text-4xl">{title}</h1>
        {description ? (
          <p className="mt-3 text-base leading-relaxed text-secondary">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}
