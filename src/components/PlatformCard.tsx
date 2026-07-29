import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { PlatformIcon } from './PlatformIcon'
import { PLATFORM_ACCENT, PLATFORM_LABEL } from './platformMeta'
import type { Platform } from '../types/api'
import { cn } from '@/lib/utils'

interface Props {
  platform: Platform
  username: string
  animIndex: number
  children: ReactNode
  /** When set, the whole card opens this platform detail route (e.g. `/leetcode/user`). */
  detailLink?: string
}

/** Editorial wrapper for a platform result card: tinted accent, header, optional details link. */
export function PlatformCard({ platform, username, animIndex, children, detailLink }: Props) {
  const accent = PLATFORM_ACCENT[platform]
  const label = PLATFORM_LABEL[platform]

  return (
    <div
      className={cn(
        'card-slide-up group relative flex flex-col overflow-hidden rounded-xl border border-border/60 bg-card/30 transition-colors hover:border-border',
        detailLink && 'hover:border-primary/40 hover:bg-card/50',
      )}
      style={{ animationDelay: `${animIndex * 80}ms` }}
    >
      {detailLink ? (
        <Link
          to={detailLink}
          className="absolute inset-0 z-10"
          aria-label={`Open full ${label} details for ${username}`}
        />
      ) : null}

      <div
        className="h-px w-full"
        style={{
          background: `linear-gradient(90deg, ${accent}, color-mix(in srgb, ${accent} 20%, transparent) 70%, transparent)`,
        }}
      />

      <div className="relative z-0 flex items-center justify-between gap-2 border-b border-border/50 px-5 py-3.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <PlatformIcon platform={platform} className="size-3.5 shrink-0" />
          <span className="text-sm font-medium text-foreground">{label}</span>
          <span className="truncate font-mono text-[11px] text-muted-foreground">{username}</span>
        </div>
        {detailLink ? (
          <span className="link-quiet pointer-events-none inline-flex shrink-0 items-center gap-1 font-mono text-[10px] uppercase tracking-[0.18em] text-primary group-hover:underline">
            Full details
            <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
          </span>
        ) : null}
      </div>
      <div className="relative z-0 flex-1">{children}</div>
    </div>
  )
}
