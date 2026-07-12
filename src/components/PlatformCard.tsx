import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { PlatformIcon } from './PlatformIcon'
import { PLATFORM_ACCENT, PLATFORM_LABEL } from './platformMeta'
import type { Platform } from '../types/api'

interface Props {
  platform: Platform
  username: string
  animIndex: number
  children: ReactNode
  detailLink?: string
}

/** Editorial wrapper for a platform result card on the home page: a
 *  platform-tinted top accent, a header with the platform icon + label and
 *  the username in mono, and a quiet "Details →" link. */
export function PlatformCard({ platform, username, animIndex, children, detailLink }: Props) {
  const accent = PLATFORM_ACCENT[platform]
  const label = PLATFORM_LABEL[platform]

  return (
    <div
      className="card-slide-up group relative flex flex-col overflow-hidden rounded-xl border border-border/60 bg-card/30 transition-colors hover:border-border"
      style={{ animationDelay: `${animIndex * 80}ms` }}
    >
      {/* platform-tinted top accent */}
      <div className="h-px w-full" style={{ background: `linear-gradient(90deg, ${accent}, color-mix(in srgb, ${accent} 20%, transparent) 70%, transparent)` }} />

      <div className="flex items-center justify-between gap-2 border-b border-border/50 px-5 py-3.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <PlatformIcon platform={platform} className="size-3.5 shrink-0" />
          <span className="text-sm font-medium text-foreground">{label}</span>
          <span className="truncate font-mono text-[11px] text-muted-foreground">
            {username}
          </span>
        </div>
        {detailLink && (
          <Link
            to={detailLink}
            className="link-quiet inline-flex shrink-0 items-center gap-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground hover:text-primary"
          >
            Details
            <ArrowRight className="size-3" />
          </Link>
        )}
      </div>
      <div className="flex-1">
        {children}
      </div>
    </div>
  )
}
