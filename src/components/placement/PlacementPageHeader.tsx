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
    <div className={cn('flex min-w-0 flex-col gap-4 md:flex-row md:items-start md:justify-between', className)}>
      <div className="min-w-0 max-w-2xl">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-[40px]">{title}</h1>
        {description ? (
          <p className="mt-2 text-[14px] leading-relaxed text-secondary">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex w-full min-w-0 flex-wrap items-center gap-2 md:w-auto md:justify-end">{actions}</div> : null}
    </div>
  )
}
