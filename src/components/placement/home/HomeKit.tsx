import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { PlacementLink } from '@/components/placement/PlacementLink'
import { formatHomeDate, greetingForHour, type HomeQuote } from '@/lib/placementHomeContent'
import { cn } from '@/lib/utils'

const PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  left: `${(i * 17) % 100}%`,
  top: `${(i * 29) % 100}%`,
  delay: `${(i % 7) * 0.6}s`,
  duration: `${10 + (i % 5)}s`,
}))

export function HomeHero({
  name,
  quote,
  actions,
  illustrationLabel,
}: {
  name: string
  quote: HomeQuote
  actions?: Array<{ label: string; href: string; primary?: boolean }>
  illustrationLabel?: string
}) {
  const greeting = greetingForHour()
  const dateLabel = formatHomeDate()

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="home-hero-surface"
    >
      <div
        className="home-hero-orb"
        style={{ width: 220, height: 220, left: '8%', top: '12%', background: 'rgba(255,122,0,0.28)' }}
      />
      <div
        className="home-hero-orb"
        style={{ width: 280, height: 280, right: '6%', bottom: '8%', background: 'rgba(255,210,138,0.16)' }}
      />
      {PARTICLES.map((p) => (
        <span
          key={p.id}
          className="home-particle"
          style={{ left: p.left, top: p.top, animationDelay: p.delay, animationDuration: p.duration }}
        />
      ))}

      <div className="relative z-10 flex min-h-[450px] flex-col justify-between gap-8 p-6 sm:p-8 lg:p-10 lg:flex-row lg:items-end">
        <div className="max-w-3xl">
          <p className="text-[13px] font-semibold tracking-wide text-[#FFD28A]">{dateLabel}</p>
          <h1 className="mt-3 font-heading text-[34px] font-bold leading-tight text-white sm:text-[42px]">
            {greeting},
            <span className="mt-1 block text-[28px] font-semibold text-white/90 sm:text-[34px]">
              Welcome back, {name}
            </span>
          </h1>
          <p className="mt-5 max-w-2xl text-[20px] font-medium leading-snug text-white/95 sm:text-[24px]">
            “{quote.quote}”
          </p>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-[#A1A1AA]">{quote.subtitle}</p>

          {actions?.length ? (
            <div className="mt-7 flex flex-wrap gap-3">
              {actions.map((action) => (
                <Button
                  key={action.href}
                  asChild
                  size="sm"
                  variant={action.primary ? 'default' : 'outline'}
                  className={cn(
                    'rounded-xl transition duration-300 hover:scale-[1.03]',
                    action.primary && 'shadow-[0_0_24px_-6px_rgba(255,122,0,0.75)]',
                  )}
                >
                  <PlacementLink href={action.href}>
                    {action.label}
                    <ArrowRight className="ml-1.5 size-3.5" />
                  </PlacementLink>
                </Button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="home-glass hidden w-full max-w-xs shrink-0 p-5 lg:block">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#FFD28A]">
            {illustrationLabel ?? 'Impact'}
          </p>
          <p className="mt-3 text-[15px] leading-relaxed text-white/85">
            A calm command center for decisions that change student outcomes — not another crowded ERP.
          </p>
          <div className="mt-5 h-24 rounded-2xl bg-gradient-to-br from-[#FF7A00]/30 via-transparent to-[#FFD28A]/20" />
        </div>
      </div>
    </motion.section>
  )
}

export function useCountUp(value: number, durationMs = 900) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    let frame = 0
    const start = performance.now()
    const from = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs)
      const eased = 1 - (1 - t) ** 3
      setDisplay(Math.round(from + (value - from) * eased))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value, durationMs])
  return display
}

export function GlassStatCard({
  label,
  value,
  hint,
  icon,
  delay = 0,
}: {
  label: string
  value: number | string
  hint?: string
  icon?: ReactNode
  delay?: number
}) {
  const numeric = typeof value === 'number' && Number.isFinite(value) ? value : null
  const counted = useCountUp(numeric ?? 0)
  const shown = numeric == null ? value : counted

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      whileHover={{ scale: 1.03 }}
      className="home-glass p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-[#A1A1AA]">{label}</p>
          <p className="mt-2 font-heading text-[28px] font-bold tabular-nums text-white">
            {shown === '' || shown == null ? '—' : shown}
          </p>
          {hint ? <p className="mt-1 text-[12px] text-[#A1A1AA]">{hint}</p> : null}
        </div>
        {icon ? (
          <div className="inline-flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-binance">
            {icon}
          </div>
        ) : null}
      </div>
    </motion.div>
  )
}

export function InsightCard({
  label,
  value,
  delay = 0,
}: {
  label: string
  value: string
  delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      whileHover={{ scale: 1.03 }}
      className="home-glass p-5"
    >
      <p className="text-[12px] font-semibold uppercase tracking-wide text-[#FFD28A]">{label}</p>
      <p className="mt-2 text-[16px] font-semibold text-white">{value}</p>
    </motion.div>
  )
}

export function HomeSection({
  title,
  subtitle,
  children,
  action,
}: {
  title: string
  subtitle?: string
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-heading text-[20px] font-bold text-white">{title}</h2>
          {subtitle ? <p className="mt-1 text-[13px] text-[#A1A1AA]">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

export function HomeEmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="home-glass flex min-h-[160px] flex-col items-center justify-center gap-2 p-8 text-center">
      <div className="h-16 w-28 rounded-2xl bg-gradient-to-br from-primary/25 to-transparent" />
      <p className="mt-2 text-[15px] font-semibold text-white">{title}</p>
      <p className="max-w-sm text-[13px] text-[#A1A1AA]">{description}</p>
    </div>
  )
}

export function HomeSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-[450px] w-full rounded-[24px]" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-[20px]" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-72 rounded-[20px]" />
        <Skeleton className="h-72 rounded-[20px]" />
      </div>
    </div>
  )
}

export function NewsFeed({
  items,
  emptyTitle = 'No recent announcements',
  emptyDescription = 'Activity will appear here as the cohort progresses.',
}: {
  items: Array<{ id: string; icon: string; title: string; description: string; time: string }>
  emptyTitle?: string
  emptyDescription?: string
}) {
  const loop = useMemo(() => (items.length > 3 ? [...items, ...items] : items), [items])

  if (!items.length) {
    return <HomeEmptyState title={emptyTitle} description={emptyDescription} />
  }

  return (
    <div className="home-glass relative max-h-[360px] overflow-hidden p-2">
      <div className={cn(items.length > 3 && 'home-feed-track')}>
        {loop.map((item, index) => (
          <article
            key={`${item.id}-${index}`}
            className="flex gap-3 rounded-2xl px-3 py-3 transition hover:bg-white/[0.03]"
          >
            <span className="mt-0.5 text-[18px]" aria-hidden>
              {item.icon}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-[14px] font-semibold text-white">{item.title}</h3>
                <span className="shrink-0 text-[11px] text-[#A1A1AA]">{item.time}</span>
              </div>
              <p className="mt-1 text-[13px] leading-relaxed text-[#A1A1AA]">{item.description}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

export function ActivityTimeline({
  items,
}: {
  items: Array<{ id: string; title: string; description: string; date: string; tone?: 'default' | 'success' | 'warn' }>
}) {
  if (!items.length) {
    return (
      <HomeEmptyState
        title="No training updates"
        description="Upcoming sessions and campus events will land on this timeline."
      />
    )
  }

  return (
    <div className="home-glass space-y-0 p-5">
      {items.map((item, index) => (
        <div key={item.id} className="relative flex gap-4 pb-5 last:pb-0">
          {index < items.length - 1 ? (
            <span className="absolute left-[7px] top-4 h-[calc(100%-8px)] w-px bg-white/10" />
          ) : null}
          <span
            className={cn(
              'relative z-[1] mt-1 size-3.5 shrink-0 rounded-full border-2 border-[#09090B]',
              item.tone === 'success' && 'bg-[#0ECB81]',
              item.tone === 'warn' && 'bg-[#FF9A3D]',
              (!item.tone || item.tone === 'default') && 'bg-[#FF7A00]',
            )}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-[14px] font-semibold text-white">{item.title}</h3>
              <span className="text-[11px] font-medium text-[#A1A1AA]">{item.date}</span>
            </div>
            <p className="mt-1 text-[13px] text-[#A1A1AA]">{item.description}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

export function SuccessStoryCard({
  name,
  roll,
  detail,
  rank,
}: {
  name: string
  roll?: string
  detail: string
  rank?: number
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      className="home-glass flex items-center gap-4 p-4"
    >
      <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/40 to-transparent font-heading text-[16px] font-bold text-white">
        {name.trim().slice(0, 1).toUpperCase() || 'S'}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-semibold text-white">
          {rank ? `#${rank} · ` : ''}
          {name}
        </p>
        {roll ? <p className="text-[11px] font-mono text-[#A1A1AA]">{roll}</p> : null}
        <p className="mt-1 text-[13px] text-[#FFD28A]">{detail}</p>
      </div>
    </motion.div>
  )
}

export function TopPerformerCard({
  rank,
  name,
  roll,
  readiness,
  communication,
  overall,
}: {
  rank: number
  name: string
  roll: string
  readiness: number
  communication: number
  overall: number
}) {
  const metal =
    rank === 1 ? 'from-amber-300/40 to-amber-600/10' : rank === 2 ? 'from-zinc-200/30 to-zinc-500/10' : rank === 3 ? 'from-orange-400/30 to-orange-700/10' : 'from-white/10 to-transparent'
  const circumference = 2 * Math.PI * 28
  const offset = circumference - (Math.min(100, overall) / 100) * circumference

  return (
    <motion.div whileHover={{ scale: 1.03 }} className={cn('home-glass relative overflow-hidden p-4', `bg-gradient-to-br ${metal}`)}>
      <div className="flex items-center gap-4">
        <div className="relative size-16 shrink-0">
          <svg viewBox="0 0 64 64" className="size-16 -rotate-90">
            <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
            <circle
              cx="32"
              cy="32"
              r="28"
              fill="none"
              stroke="#FF7A00"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[12px] font-bold text-white">
            {Math.round(overall)}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#FFD28A]">Rank {rank}</p>
          <p className="truncate text-[15px] font-semibold text-white">{name}</p>
          <p className="font-mono text-[11px] text-[#A1A1AA]">{roll}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-[#A1A1AA]">
            <span>Readiness {readiness}</span>
            <span>·</span>
            <span>Comm {communication}</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export function MotivationalBanner({ quote }: { quote: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="home-glass border-primary/20 p-6 text-center"
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#FFD28A]">Stay inspired</p>
      <p className="mt-3 font-heading text-[18px] font-semibold text-white sm:text-[20px]">“{quote}”</p>
    </motion.div>
  )
}
