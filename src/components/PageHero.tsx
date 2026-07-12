import { Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { PlatformIcon } from './PlatformIcon'
import { PLATFORM_ACCENT, PLATFORM_LABEL } from './platformMeta'
import type { Platform } from '@/types/api'
import { cn } from '@/lib/utils'

interface HeroStat {
  value: number
  label: string
  suffix?: string
}

interface Props {
  platform: Platform
  /** The big display title (usually the handle). */
  title: string
  /** Optional subtitle line under the title (org, country, real name…). */
  subtitle?: React.ReactNode
  /** Avatar image source; falls back to the first letter of `fallback` (defaults to title). */
  avatarSrc?: string
  avatarFallback?: string
  /** Extra badges to render after the platform badge (rank, stars, active badge…). */
  badges?: React.ReactNode
  /** One or two headline figures shown on the right as an "at a glance" band. */
  stats?: HeroStat[]
  /** Override the accent color (defaults to the platform brand color). */
  accent?: string
}

/** Unified editorial masthead for every platform detail page: a platform-aura
 *  backed avatar, a platform badge + secondary badge row, a display title,
 *  an optional subtitle, and a right-side "at a glance" stat band. */
export function PageHero({
  platform,
  title,
  subtitle,
  avatarSrc,
  avatarFallback,
  badges,
  stats,
  accent = PLATFORM_ACCENT[platform],
}: Props) {
  const fallback = (avatarFallback ?? title).charAt(0).toUpperCase()

  return (
    <header className="rise-in relative pb-5">
      {/* faint platform watermark in the corner */}
      <PlatformIcon
        platform={platform}
        className="pointer-events-none absolute -top-6 right-0 size-28 opacity-[0.04]"
        aria-hidden
      />

      <div className="flex flex-col gap-7 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-4">
          {avatarSrc && (
            <div className="relative shrink-0">
              <span
                className="platform-aura rounded-2xl"
                style={{ background: `radial-gradient(closest-side, ${accent}, transparent 75%)` }}
                aria-hidden
              />
              <Avatar className="relative size-16 rounded-2xl">
                <AvatarImage src={avatarSrc} alt={title} className="rounded-2xl" />
                <AvatarFallback className="rounded-2xl">{fallback}</AvatarFallback>
              </Avatar>
            </div>
          )}

          <div className="min-w-0">
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <BadgePill platform={platform} accent={accent} />
              {badges}
            </div>
            <h1 className="truncate text-4xl font-display font-semibold tracking-tight text-foreground md:text-5xl">
              {title}
            </h1>
            {subtitle && (
              <div className="mt-1.5 text-sm text-muted-foreground">{subtitle}</div>
            )}
          </div>
        </div>

        {stats && stats.length > 0 && (
          <div className="flex shrink-0 flex-col gap-1.5 sm:items-end">
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground/50">
              At a glance
            </span>
            <div className="stat-band grid w-full grid-cols-2 sm:w-auto sm:grid-flow-col sm:auto-cols-fr">
              {stats.map((s) => (
                <HeroStat key={s.label} stat={s} accent={accent} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* platform-tinted hairline under the masthead */}
      <div
        className="mt-6 h-px w-full"
        style={{
          background: `linear-gradient(90deg, ${accent} 0%, color-mix(in srgb, ${accent} 18%, transparent) 38%, var(--color-border) 100%)`,
        }}
      />
    </header>
  )
}

function HeroStat({ stat, accent }: { stat: HeroStat; accent: string }) {
  return (
    <div className="flex flex-col gap-1.5 sm:px-6 sm:first:pl-0 sm:last:pr-0">
      <span
        className="font-pixel text-[2.4rem] leading-none tracking-normal"
        style={{ color: accent }}
      >
        {stat.value.toLocaleString()}{stat.suffix}
      </span>
      <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
        {stat.label}
      </span>
    </div>
  )
}

export function BadgePill({ platform, accent }: { platform: Platform; accent?: string }) {
  const color = accent ?? PLATFORM_ACCENT[platform]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border bg-background/40 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em]',
      )}
      style={{ color, borderColor: `color-mix(in srgb, ${color} 30%, transparent)` }}
    >
      <PlatformIcon platform={platform} className="size-3" />
      {PLATFORM_LABEL[platform]}
    </span>
  )
}

export function BackLink({ to = '/app' }: { to?: string }) {
  return (
    <Button variant="ghost" size="sm" asChild className="w-fit font-mono text-xs text-muted-foreground hover:text-primary">
      <Link to={to}>
        <ArrowLeft data-icon="inline-start" />
        Back to dashboard
      </Link>
    </Button>
  )
}
