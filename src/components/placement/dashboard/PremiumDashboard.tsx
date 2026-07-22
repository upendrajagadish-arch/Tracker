import { useEffect, useRef, useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowUpRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleGauge,
  ExternalLink,
  GraduationCap,
  Link2,
  Sparkles,
  Target,
  Trophy,
  UserCheck,
  Users,
  UserX,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { PlacementLink } from '@/components/placement/PlacementLink'
import { MeasuredChart } from '@/components/placement/charts/ChartShell'
import type { DashboardSnapshot } from '@/api/placement/premiumDashboard'
import { BADGE_CHART_COLORS } from '@/components/placement/charts/chartTheme'
import {
  TECH_STACK_BADGE_EMOJI,
  TECH_STACK_BADGE_LABELS,
  TECH_STACK_BADGE_ORDER,
  type BadgeCountMap,
  type TechStackBadge,
} from '@/lib/techStackBadge'
import { SectionExportActions } from '@/components/placement/SectionExportActions'
import { tableSectionExport } from '@/lib/analyticsExports'
import { cn } from '@/lib/utils'
import { Cell, PolarAngleAxis, RadialBar, RadialBarChart } from 'recharts'

function badgeRows(counts: BadgeCountMap): Array<{ badge: TechStackBadge; count: number; color: string }> {
  return TECH_STACK_BADGE_ORDER.map((badge) => ({
    badge,
    count: counts[badge],
    color: BADGE_CHART_COLORS[badge],
  }))
}

function SkillsBadgeYearModal({
  skillBadges,
  preferredYear,
  onClose,
}: {
  skillBadges: DashboardSnapshot['skillBadges']
  preferredYear?: string
  onClose: () => void
}) {
  const years = skillBadges.byYear.map((row) => row.year)
  const initialYear =
    preferredYear && preferredYear !== 'all' && years.includes(preferredYear)
      ? preferredYear
      : years[0] ?? 'All'
  const [year, setYear] = useState(initialYear)
  const dialogRef = useRef<HTMLDivElement>(null)
  const selected =
    skillBadges.byYear.find((row) => row.year === year) ??
    ({
      year: 'All',
      tech: skillBadges.tech,
      communication: skillBadges.communication,
      techAvg: 0,
      communicationAvg: 0,
      studentCount: skillBadges.techTotal,
    } as DashboardSnapshot['skillBadges']['byYear'][number])

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', close)
    requestAnimationFrame(() => dialogRef.current?.querySelector<HTMLElement>('button')?.focus())
    return () => {
      window.removeEventListener('keydown', close)
      document.body.style.overflow = previousOverflow
      previousFocus?.focus()
    }
  }, [onClose])

  const techRows = badgeRows(selected.tech)
  const communicationRows = badgeRows(selected.communication)
  const maxTech = Math.max(...techRows.map((row) => row.count), 1)
  const maxComm = Math.max(...communicationRows.map((row) => row.count), 1)

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Tech and communication badge dashboard"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={dialogRef}
        className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-primary/35 bg-[#0B0E11] shadow-[0_0_55px_-22px_rgba(210,121,24,0.9)]"
      >
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-heading text-xl font-bold text-primary">Skills badge dashboard</h3>
            <p className="text-xs text-muted-foreground">
              Year-wise Gold / Silver / Bronze / Poor for Tech Stack and Communication
            </p>
          </div>
          <SectionExportActions
            section={tableSectionExport(
              `Skills badges · ${selected.year}`,
              ['Area', 'Badge', 'Count'],
              [
                ...techRows.map((row) => ['Tech Stack', TECH_STACK_BADGE_LABELS[row.badge], String(row.count)]),
                ...communicationRows.map((row) => [
                  'Communication',
                  TECH_STACK_BADGE_LABELS[row.badge],
                  String(row.count),
                ]),
              ],
              { fileBase: `skills_badges_${selected.year}` },
            )}
            size="xs"
          />
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close skills badge dashboard">
            <X className="size-4" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          <div className="flex w-full gap-1 overflow-x-auto rounded-card border border-soft bg-elevated p-1">
            {years.map((tabYear) => (
              <button
                key={tabYear}
                type="button"
                onClick={() => setYear(tabYear)}
                className={`min-w-[5rem] flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  year === tabYear
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-background/60 hover:text-foreground'
                }`}
              >
                {tabYear}
              </button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-background/40 px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Students</p>
              <p className="tnum mt-1 text-2xl font-bold text-primary">{selected.studentCount}</p>
            </div>
            <div className="rounded-xl border border-border bg-background/40 px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Avg tech score</p>
              <p className="tnum mt-1 text-2xl font-bold text-primary">{selected.techAvg}%</p>
            </div>
            <div className="rounded-xl border border-border bg-background/40 px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Avg communication</p>
              <p className="tnum mt-1 text-2xl font-bold text-primary">{selected.communicationAvg}%</p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-soft bg-card/80 p-4">
              <h4 className="mb-3 font-heading text-base font-bold">Tech Stack badges · {selected.year}</h4>
              <div className="space-y-3">
                {techRows.map((row) => (
                  <div key={`tech-${row.badge}`}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span>
                        {TECH_STACK_BADGE_EMOJI[row.badge]} {TECH_STACK_BADGE_LABELS[row.badge]}
                      </span>
                      <span className="tnum font-bold" style={{ color: row.color }}>
                        {row.count}
                      </span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${(row.count / maxTech) * 100}%`, background: row.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-soft bg-card/80 p-4">
              <h4 className="mb-3 font-heading text-base font-bold">Communication badges · {selected.year}</h4>
              <div className="space-y-3">
                {communicationRows.map((row) => (
                  <div key={`comm-${row.badge}`}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span>
                        {TECH_STACK_BADGE_EMOJI[row.badge]} {TECH_STACK_BADGE_LABELS[row.badge]}
                      </span>
                      <span className="tnum font-bold" style={{ color: row.color }}>
                        {row.count}
                      </span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${(row.count / maxComm) * 100}%`, background: row.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ConsolidatedSkillsBadgeCard({
  skillBadges,
  onOpen,
}: {
  skillBadges: DashboardSnapshot['skillBadges']
  onOpen: () => void
}) {
  const techTotal = Math.max(skillBadges.techTotal, 1)
  const communicationTotal = Math.max(skillBadges.communicationTotal, 1)
  return (
    <button
      type="button"
      onClick={onOpen}
      className="placement-glass group w-full rounded-2xl border border-soft p-5 text-left transition hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-primary/10 p-2.5 text-primary">
            <Sparkles className="size-5" />
          </span>
          <div>
            <h2 className="text-base font-bold">Tech + Communication badges</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Consolidated Gold / Silver / Bronze / Poor · click for year-wise graphical details
            </p>
          </div>
        </div>
        <span className="text-xs font-medium text-primary">Open year dashboard →</span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tech Stack</p>
          <div className="grid grid-cols-4 gap-2">
            {TECH_STACK_BADGE_ORDER.map((badge) => (
              <div key={`tech-sum-${badge}`} className="rounded-xl border border-border bg-background/40 px-2 py-2 text-center">
                <p className="text-lg">{TECH_STACK_BADGE_EMOJI[badge]}</p>
                <p className="tnum text-sm font-bold" style={{ color: BADGE_CHART_COLORS[badge] }}>
                  {skillBadges.tech[badge]}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {Math.round((skillBadges.tech[badge] / techTotal) * 100)}%
                </p>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Communication</p>
          <div className="grid grid-cols-4 gap-2">
            {TECH_STACK_BADGE_ORDER.map((badge) => (
              <div key={`comm-sum-${badge}`} className="rounded-xl border border-border bg-background/40 px-2 py-2 text-center">
                <p className="text-lg">{TECH_STACK_BADGE_EMOJI[badge]}</p>
                <p className="tnum text-sm font-bold" style={{ color: BADGE_CHART_COLORS[badge] }}>
                  {skillBadges.communication[badge]}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {Math.round((skillBadges.communication[badge] / communicationTotal) * 100)}%
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </button>
  )
}

function useAnimatedNumber(value: number, duration = 650) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    let frame = 0
    const started = performance.now()
    const from = display
    const tick = (now: number) => {
      const progress = Math.min(1, (now - started) / duration)
      setDisplay(Math.round(from + (value - from) * (1 - Math.pow(1 - progress, 3))))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration])
  return display
}

function MiniSparkline({ values, color = '#D27918' }: { values: number[]; color?: string }) {
  const max = Math.max(...values, 1)
  const points = values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * 100
      const y = 30 - (value / max) * 24
      return `${x},${y}`
    })
    .join(' ')
  return (
    <svg viewBox="0 0 100 32" className="h-9 w-24 overflow-visible" aria-hidden>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  )
}

function ProgressRing({ value }: { value: number }) {
  const radius = 29
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (Math.min(100, value) / 100) * circumference
  return (
    <div className="relative size-20">
      <svg className="-rotate-90 size-20" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={radius} fill="none" stroke="var(--border)" strokeWidth="7" />
        <motion.circle
          cx="36"
          cy="36"
          r={radius}
          fill="none"
          stroke="var(--brand)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </svg>
      <span className="tnum absolute inset-0 flex items-center justify-center text-sm font-bold">
        {value}%
      </span>
    </div>
  )
}

function MetricCard({
  title,
  value,
  suffix,
  icon,
  hint,
  trend,
  spark,
  color,
  ring,
  onClick,
}: {
  title: string
  value: number
  suffix?: string
  icon: ReactNode
  hint?: string
  trend?: string
  spark?: number[]
  color?: string
  ring?: boolean
  onClick?: () => void
}) {
  const animated = useAnimatedNumber(value)
  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5, scale: 1.01 }}
      transition={{ duration: 0.24 }}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(event) => {
        if (onClick && (event.key === 'Enter' || event.key === ' ')) {
          if (event.key === ' ') event.preventDefault()
          onClick()
        }
      }}
      className={cn(
        'placement-glass group relative min-h-40 overflow-hidden rounded-2xl p-4',
        onClick && 'cursor-pointer outline-none ring-primary/40 transition focus:ring-2',
      )}
    >
      <div
        aria-hidden
        className="absolute -right-10 -top-12 size-32 rounded-full opacity-15 blur-3xl"
        style={{ background: color ?? 'var(--brand)' }}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {title}
          </p>
          <p className="tnum mt-3 text-3xl font-bold tracking-tight">
            {animated}
            {suffix ? <span className="ml-1 text-sm font-semibold text-muted-foreground">{suffix}</span> : null}
          </p>
        </div>
        <span
          className="rounded-xl border p-2.5 shadow-sm"
          style={{ color: color ?? 'var(--brand)', borderColor: `${color ?? '#D27918'}55` }}
        >
          {icon}
        </span>
      </div>
      <div className="relative mt-5 flex items-end justify-between gap-2">
        <div>
          {trend ? (
            <p className="flex items-center gap-1 text-xs font-semibold text-success">
              <ArrowUpRight className="size-3.5" /> {trend}
            </p>
          ) : null}
          {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        {ring ? <ProgressRing value={value} /> : spark ? <MiniSparkline values={spark} color={color} /> : null}
      </div>
    </motion.article>
  )
}

function ManagementCard({
  title,
  value,
  detail,
  icon,
  href,
  onClick,
}: {
  title: string
  value: number
  detail: string
  icon: ReactNode
  href?: string
  onClick?: () => void
}) {
  const animated = useAnimatedNumber(value)
  const body = (
    <motion.div
      whileHover={{ y: -3 }}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(event) => {
        if (onClick && (event.key === 'Enter' || event.key === ' ')) {
          if (event.key === ' ') event.preventDefault()
          onClick()
        }
      }}
      className={cn(
        'placement-glass flex min-h-32 flex-col justify-between rounded-2xl p-4',
        onClick && 'cursor-pointer outline-none ring-primary/40 focus:ring-2',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="rounded-lg bg-primary/10 p-2 text-primary">{icon}</span>
        {href ? <ExternalLink className="size-3.5 text-muted-foreground" /> : null}
      </div>
      <div className="mt-4">
        <p className="tnum text-2xl font-bold">{animated}</p>
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
      </div>
    </motion.div>
  )
  return href && !onClick ? (
    <PlacementLink href={href} className="block">
      {body}
    </PlacementLink>
  ) : (
    body
  )
}

const TECH_RADIAL_COLORS = [
  '#F0B90B',
  '#3B82F6',
  '#0ECB81',
  '#A78BFA',
  '#F6465D',
  '#22D3EE',
  '#D27918',
] as const

type TechReadinessRow = DashboardSnapshot['techReadiness'][number]

export function TechReadinessRadialChart({
  data,
  onSelect,
}: {
  data: DashboardSnapshot['techReadiness']
  onSelect?: (row: TechReadinessRow) => void
}) {
  const [active, setActive] = useState<number | null>(null)
  const rows = data.map((row, index) => ({
    ...row,
    color: TECH_RADIAL_COLORS[index % TECH_RADIAL_COLORS.length]!,
  }))
  // Recharts draws the first datum innermost; reverse so the first tech is the outer ring.
  const chartData = [...rows].reverse()
  const toRowIndex = (chartIndex: number) => rows.length - 1 - chartIndex
  const activeRow = active != null ? rows[active] : null
  const totalStudents = rows.reduce((sum, row) => sum + row.students, 0)
  const avgScore = rows.length
    ? Math.round(rows.reduce((sum, row) => sum + row.score, 0) / rows.length)
    : 0

  return (
    <div>
      <div className="relative">
        <MeasuredChart height={250}>
          {(width) => (
            <RadialBarChart
              width={width}
              height={250}
              data={chartData}
              innerRadius="30%"
              outerRadius="110%"
              startAngle={90}
              endAngle={-270}
              barCategoryGap="24%"
            >
              <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
              <RadialBar
                dataKey="score"
                cornerRadius={14}
                background={{ fill: 'rgba(43, 49, 57, 0.5)' }}
                animationDuration={900}
                onMouseEnter={(_, chartIndex) => setActive(toRowIndex(chartIndex))}
                onMouseLeave={() => setActive(null)}
                onClick={(_, chartIndex) => {
                  const row = rows[toRowIndex(chartIndex)]
                  if (row) onSelect?.(row)
                }}
              >
                {chartData.map((entry, chartIndex) => {
                  const isActive = active === toRowIndex(chartIndex)
                  const dimmed = active != null && !isActive
                  return (
                    <Cell
                      key={entry.name}
                      fill={entry.color}
                      cursor="pointer"
                      opacity={dimmed ? 0.22 : 1}
                      style={{
                        transition: 'opacity 220ms ease, filter 220ms ease',
                        filter: isActive
                          ? `drop-shadow(0 0 10px ${entry.color}AA) drop-shadow(0 6px 8px rgba(0,0,0,0.65))`
                          : 'none',
                      }}
                    />
                  )
                })}
              </RadialBar>
            </RadialBarChart>
          )}
        </MeasuredChart>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          {activeRow ? (
            <motion.div
              key={activeRow.name}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.18 }}
            >
              <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: activeRow.color }}>
                {activeRow.name}
              </p>
              <p className="tnum text-2xl font-black" style={{ color: activeRow.color }}>
                {activeRow.score}%
              </p>
              <p className="tnum text-[11px] text-muted-foreground">{activeRow.students} students</p>
            </motion.div>
          ) : (
            <div>
              <p className="tnum text-2xl font-black text-primary">{avgScore}%</p>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Avg readiness</p>
              <p className="tnum mt-0.5 text-[11px] text-muted-foreground">{totalStudents} skill holders</p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-1.5">
        {rows.map((row, index) => {
          const isActive = active === index
          return (
            <motion.button
              key={row.name}
              type="button"
              whileHover={{ y: -2, scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onMouseEnter={() => setActive(index)}
              onMouseLeave={() => setActive(null)}
              onClick={() => onSelect?.(row)}
              className="flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left transition-colors"
              style={{
                borderColor: isActive ? `${row.color}88` : 'var(--border)',
                background: isActive ? `${row.color}1A` : 'transparent',
                boxShadow: isActive ? `0 4px 14px -6px ${row.color}` : 'none',
              }}
            >
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ background: row.color, boxShadow: isActive ? `0 0 8px ${row.color}` : 'none' }}
              />
              <span className="min-w-0 flex-1 truncate text-[11px] font-semibold">{row.name}</span>
              <span className="tnum shrink-0 text-[11px] font-bold" style={{ color: row.color }}>
                {row.score}%
              </span>
              <span className="tnum shrink-0 text-[10px] text-muted-foreground">· {row.students}</span>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

const COMM_CATEGORY_COLORS: Record<string, string> = {
  'Communication Proficiency': '#3B82F6',
  'Presentation Skills': '#0ECB81',
  'Behavioural Skills': '#D27918',
}

type CommParameter = DashboardSnapshot['communicationParameters'][number]

/** 25-segment nightingale wheel — one clickable sector per communication criterion. */
export function CommunicationParameterWheel({
  parameters,
  onSelect,
}: {
  parameters: DashboardSnapshot['communicationParameters']
  onSelect?: (param: CommParameter) => void
}) {
  const [active, setActive] = useState<string | null>(null)
  const size = 680
  const cx = size / 2
  const cy = size / 2
  const maxR = 188
  const labelR = maxR + 14
  const categoryR = maxR + 122
  const step = 360 / Math.max(parameters.length, 1)
  const gap = 0.7

  const polar = (r: number, angle: number): [number, number] => {
    const rad = ((angle - 90) * Math.PI) / 180
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)]
  }

  const wedgePath = (a0: number, a1: number, r: number) => {
    const [x0, y0] = polar(r, a0)
    const [x1, y1] = polar(r, a1)
    const large = a1 - a0 > 180 ? 1 : 0
    return `M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} Z`
  }

  const arcPath = (a0: number, a1: number, r: number, reverse: boolean) => {
    const [x0, y0] = polar(r, a0)
    const [x1, y1] = polar(r, a1)
    const large = Math.abs(a1 - a0) > 180 ? 1 : 0
    return reverse
      ? `M ${x1} ${y1} A ${r} ${r} 0 ${large} 0 ${x0} ${y0}`
      : `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`
  }

  const categories: Array<{ name: string; start: number; end: number; color: string }> = []
  parameters.forEach((param, index) => {
    const color = COMM_CATEGORY_COLORS[param.category] ?? '#D27918'
    const last = categories[categories.length - 1]
    if (last && last.name === param.category) last.end = (index + 1) * step
    else categories.push({ name: param.category, start: index * step, end: (index + 1) * step, color })
  })

  const activeParam = parameters.find((param) => param.key === active) ?? null

  return (
    <div className="relative">
      {activeParam ? (
        <motion.div
          key={activeParam.key}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="pointer-events-none absolute left-1/2 top-0 z-10 -translate-x-1/2 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[12px] font-bold shadow-lg"
          style={{
            color: COMM_CATEGORY_COLORS[activeParam.category] ?? '#D27918',
            borderColor: `${COMM_CATEGORY_COLORS[activeParam.category] ?? '#D27918'}66`,
            background: '#12161cF0',
          }}
        >
          {activeParam.label} · {activeParam.average}% — click for student scores
        </motion.div>
      ) : null}
      <MeasuredChart height={640}>
        {(width) => {
          const rendered = Math.min(width, 660)
          return (
            <div className="flex h-full items-center justify-center">
              <svg width={rendered} height={Math.min(640, rendered)} viewBox={`0 0 ${size} ${size}`}>
                <defs>
                  {categories.map((cat, index) => {
                    const mid = (cat.start + cat.end) / 2
                    const flip = mid > 90 && mid < 270
                    return (
                      <path
                        key={cat.name}
                        id={`comm-cat-arc-${index}`}
                        d={arcPath(cat.start + 2, cat.end - 2, categoryR, flip)}
                        fill="none"
                      />
                    )
                  })}
                </defs>

                {[0.25, 0.5, 0.75, 1].map((fraction) => (
                  <circle
                    key={fraction}
                    cx={cx}
                    cy={cy}
                    r={maxR * fraction}
                    fill="none"
                    stroke="rgba(146, 154, 165, 0.18)"
                    strokeWidth={fraction === 1 ? 1.4 : 1}
                  />
                ))}
                {[25, 50, 75, 100].map((value) => (
                  <text
                    key={value}
                    x={cx + 4}
                    y={cy - (maxR * value) / 100 + 10}
                    fontSize={8.5}
                    fill="rgba(146, 154, 165, 0.55)"
                  >
                    {value}
                  </text>
                ))}
                {parameters.map((_, index) => {
                  const [x, y] = polar(maxR, index * step)
                  return (
                    <line
                      key={index}
                      x1={cx}
                      y1={cy}
                      x2={x}
                      y2={y}
                      stroke="rgba(146, 154, 165, 0.12)"
                      strokeWidth={1}
                    />
                  )
                })}
                {categories.map((cat) => {
                  const [x, y] = polar(maxR + 104, cat.start)
                  return (
                    <line
                      key={cat.name}
                      x1={cx}
                      y1={cy}
                      x2={x}
                      y2={y}
                      stroke="rgba(146, 154, 165, 0.35)"
                      strokeWidth={1.4}
                    />
                  )
                })}

                {parameters.map((param, index) => {
                  const color = COMM_CATEGORY_COLORS[param.category] ?? '#D27918'
                  const a0 = index * step + gap
                  const a1 = (index + 1) * step - gap
                  const valueR = Math.max(8, (param.average / 100) * maxR)
                  const isActive = active === param.key
                  const dimmed = active != null && !isActive
                  return (
                    <g key={param.key}>
                      <path d={wedgePath(a0, a1, maxR)} fill={color} opacity={0.06} />
                      <path
                        d={wedgePath(a0, a1, valueR)}
                        fill={color}
                        stroke="#0B0E11"
                        strokeWidth={1}
                        opacity={dimmed ? 0.22 : isActive ? 1 : index % 2 === 0 ? 0.88 : 0.68}
                        style={{
                          transformOrigin: `${cx}px ${cy}px`,
                          transform: isActive ? 'scale(1.06)' : 'scale(1)',
                          transition: 'transform 220ms ease, opacity 220ms ease, filter 220ms ease',
                          filter: isActive
                            ? `drop-shadow(0 0 14px ${color}) drop-shadow(0 6px 10px rgba(0,0,0,0.6))`
                            : 'none',
                        }}
                      />
                      <path
                        d={wedgePath(a0, a1, maxR)}
                        fill="transparent"
                        style={{ cursor: 'pointer' }}
                        onMouseEnter={() => setActive(param.key)}
                        onMouseLeave={() => setActive(null)}
                        onClick={() => onSelect?.(param)}
                      />
                    </g>
                  )
                })}

                {parameters.map((param, index) => {
                  const color = COMM_CATEGORY_COLORS[param.category] ?? '#D27918'
                  const mid = (index + 0.5) * step
                  const [x, y] = polar(labelR, mid)
                  const flip = mid > 180
                  const isActive = active === param.key
                  return (
                    <text
                      key={param.key}
                      x={x}
                      y={y}
                      dy={3.5}
                      fontSize={10}
                      fontWeight={isActive ? 800 : 600}
                      textAnchor={flip ? 'end' : 'start'}
                      transform={`rotate(${flip ? mid + 90 : mid - 90}, ${x}, ${y})`}
                      fill={isActive ? color : 'var(--muted-foreground)'}
                      style={{ cursor: 'pointer', transition: 'fill 180ms ease' }}
                      onMouseEnter={() => setActive(param.key)}
                      onMouseLeave={() => setActive(null)}
                      onClick={() => onSelect?.(param)}
                    >
                      {param.label}
                    </text>
                  )
                })}

                {categories.map((cat, index) => (
                  <text key={cat.name} fontSize={13} fontWeight={800} letterSpacing={2.5} fill={cat.color}>
                    <textPath href={`#comm-cat-arc-${index}`} startOffset="50%" textAnchor="middle">
                      {cat.name.toUpperCase()}
                    </textPath>
                  </text>
                ))}

                <circle cx={cx} cy={cy} r={4} fill="#D27918" />
              </svg>
            </div>
          )
        }}
      </MeasuredChart>
    </div>
  )
}

function Panel({
  title,
  description,
  icon,
  children,
  className,
  onDetails,
  exportSection,
}: {
  title: string
  description: string
  icon: ReactNode
  children: ReactNode
  className?: string
  onDetails?: () => void
  exportSection?: ReturnType<typeof tableSectionExport>
}) {
  return (
    <section className={cn('placement-glass rounded-2xl p-5', className)}>
      <div className="mb-5 flex items-start gap-3">
        <span className="rounded-xl bg-primary/10 p-2.5 text-primary">{icon}</span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold">{title}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>
        <div className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-1.5">
          {exportSection ? <SectionExportActions section={exportSection} size="xs" /> : null}
          {onDetails ? (
            <Button type="button" variant="ghost" size="sm" className="text-primary" onClick={onDetails}>
              View details
            </Button>
          ) : null}
        </div>
      </div>
      {children}
    </section>
  )
}

interface DetailState {
  title: string
  description: string
  columns: string[]
  rows: string[][]
}

function DetailModal({
  detail,
  onClose,
}: {
  detail: DetailState
  onClose: () => void
}) {
  const dialogRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'Tab') {
        const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',
        )
        if (!focusable?.length) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }
    window.addEventListener('keydown', close)
    requestAnimationFrame(() => dialogRef.current?.querySelector<HTMLElement>('button')?.focus())
    return () => {
      window.removeEventListener('keydown', close)
      document.body.style.overflow = previousOverflow
      previousFocus?.focus()
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={detail.title}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <motion.div
        ref={dialogRef}
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="flex max-h-[86vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-primary/35 bg-[#0B0E11] shadow-[0_0_60px_-24px_rgba(210,121,24,0.9)]"
      >
        <div className="flex items-start gap-3 border-b border-border px-4 py-4 sm:px-5">
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold text-foreground">{detail.title}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{detail.description}</p>
          </div>
          <span className="tnum rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
            {detail.rows.length} records
          </span>
          <SectionExportActions
            section={tableSectionExport(detail.title, detail.columns, detail.rows, {
              description: detail.description,
              fileBase: detail.title,
            })}
            size="xs"
          />
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close details">
            <X className="size-4" />
          </Button>
        </div>
        <div className="min-h-0 overflow-auto">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead className="sticky top-0 z-10 bg-[#111418]">
              <tr>
                {detail.columns.map((column) => (
                  <th key={column} className="border-b border-border px-4 py-3 text-xs uppercase tracking-wide text-primary">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {detail.rows.map((row, rowIndex) => (
                <tr key={`${rowIndex}-${row.join('-')}`} className="border-b border-border/70 hover:bg-primary/5">
                  {row.map((cell, cellIndex) => (
                    <td key={`${cellIndex}-${cell}`} className="px-4 py-3 text-xs text-foreground">
                      {cell || '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {!detail.rows.length ? (
            <p className="py-12 text-center text-sm text-muted-foreground">No matching details are available.</p>
          ) : null}
        </div>
      </motion.div>
    </div>
  )
}

export function PremiumDashboardSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-40 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-80 rounded-2xl" />
        ))}
      </div>
    </div>
  )
}

export function PremiumDashboard({
  snapshot,
  base,
}: {
  snapshot: DashboardSnapshot
  base: string | null
}) {
  const [detail, setDetail] = useState<DetailState | null>(null)
  const [skillsOpen, setSkillsOpen] = useState(false)
  const { overview, management } = snapshot
  const managementHref = base ? `${base}/operations` : undefined
  const readinessSpark = snapshot.overview.readinessDistribution
  const openStudents = (
    title: string,
    description: string,
    predicate: (student: DashboardSnapshot['studentDetails'][number]) => boolean,
  ) => {
    const rows = snapshot.studentDetails
      .filter(predicate)
      .sort((a, b) => {
        if (b.readinessScore !== a.readinessScore) return b.readinessScore - a.readinessScore
        return a.rollNumber.localeCompare(b.rollNumber, undefined, { numeric: true })
      })
      .map((student, index) => [
        String(index + 1),
        student.fullName,
        student.rollNumber,
        student.branch,
        `${student.readinessScore}%`,
        student.placementStatus.replace(/_/g, ' '),
      ])
    setDetail({
      title,
      description,
      columns: ['S.No', 'Student', 'Roll Number', 'Branch', 'Readiness', 'Status'],
      rows,
    })
  }

  return (
    <div className="space-y-5">
      {detail ? <DetailModal detail={detail} onClose={() => setDetail(null)} /> : null}
      {skillsOpen && snapshot.skillBadges ? (
        <SkillsBadgeYearModal
          skillBadges={snapshot.skillBadges}
          preferredYear={snapshot.batch}
          onClose={() => setSkillsOpen(false)}
        />
      ) : null}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <MetricCard
          title="Total Students"
          value={overview.totalStudents}
          suffix="Students"
          icon={<GraduationCap className="size-5" />}
          hint="Active in selected batch"
          spark={readinessSpark}
          color="#D27918"
          onClick={() => openStudents('All students', 'Active students in the selected batch.', () => true)}
        />
        <MetricCard
          title="Above 60%"
          value={overview.above60}
          icon={<Target className="size-5" />}
          hint="Placement readiness ≥ 60"
          spark={readinessSpark.slice(1)}
          color="#D27918"
          onClick={() => openStudents('Students above 60%', 'Students with readiness scores of 60 or higher.', (student) => student.readinessScore >= 60)}
        />
        <MetricCard
          title="Above 70%"
          value={overview.above70}
          icon={<CheckCircle2 className="size-5" />}
          hint="Placement readiness ≥ 70"
          spark={readinessSpark.slice(2)}
          color="#D27918"
          onClick={() => openStudents('Students above 70%', 'Students with readiness scores of 70 or higher.', (student) => student.readinessScore >= 70)}
        />
        <MetricCard
          title="Above 80%"
          value={overview.above80}
          icon={<Trophy className="size-5" />}
          hint="Placement readiness ≥ 80"
          spark={readinessSpark.slice(2).reverse()}
          color="#D27918"
          onClick={() => openStudents('Students above 80%', 'Students with readiness scores of 80 or higher.', (student) => student.readinessScore >= 80)}
        />
        <MetricCard
          title="Placements"
          value={overview.placed}
          icon={<UserCheck className="size-5" />}
          trend={`${overview.placementPercentage}% placement rate`}
          hint={`${overview.unplaced} students remaining`}
          spark={[overview.unplaced, overview.above60, overview.above70, overview.placed]}
          color="#D27918"
          onClick={() => openStudents('Placed students', 'Students whose placement status is placed or offered.', (student) => ['PLACED', 'OFFERED'].includes(student.placementStatus.toUpperCase()))}
        />
        <MetricCard
          title="Placement Progress"
          value={overview.placementProgress}
          suffix="%"
          icon={<CircleGauge className="size-5" />}
          hint="Overall cohort progress"
          ring
          color="#D27918"
          onClick={() => openStudents('Placement progress details', `${overview.placed} placed and ${overview.unplaced} remaining students.`, () => true)}
        />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <ManagementCard
          title="Company Links"
          value={management.companyLinks}
          detail="Shared with students"
          icon={<Link2 className="size-4.5" />}
          href={managementHref}
          onClick={() =>
            setDetail({
              title: 'Company links shared',
              description: 'Active company opportunities shared with the selected batch.',
              columns: ['S.No', 'Label', 'Audience', 'URL'],
              rows: snapshot.companyLinkDetails.map((link, index) => [
                String(index + 1),
                link.label,
                link.batches.join(', ') || 'All batches',
                link.url,
              ]),
            })
          }
        />
        <ManagementCard
          title="On-Campus Companies"
          value={management.onCampusCompanies}
          detail="Conducting campus drives"
          icon={<Building2 className="size-4.5" />}
          href={managementHref}
          onClick={() =>
            setDetail({
              title: 'On-campus companies',
              description: 'On-campus drives visible to the selected batch.',
              columns: ['S.No', 'Drive', 'Date', 'Venue', 'Status'],
              rows: snapshot.upcomingEvents
                .filter((event) => event.mode === 'on_campus')
                .map((event, index) => [
                  String(index + 1),
                  event.title,
                  new Date(event.starts_at).toLocaleString(),
                  event.venue,
                  event.status,
                ]),
            })
          }
        />
        <ManagementCard
          title="Upcoming Drives"
          value={management.upcomingDrives}
          detail="Scheduled for this cohort"
          icon={<CalendarDays className="size-4.5" />}
          href={managementHref}
          onClick={() =>
            setDetail({
              title: 'Upcoming drives',
              description: 'Scheduled placement events for the selected batch.',
              columns: ['S.No', 'Drive', 'Mode', 'Date', 'Venue'],
              rows: snapshot.upcomingEvents.map((event, index) => [
                String(index + 1),
                event.title,
                event.mode.replace(/_/g, ' '),
                new Date(event.starts_at).toLocaleString(),
                event.venue,
              ]),
            })
          }
        />
        <ManagementCard
          title="Placed Students"
          value={overview.placed}
          detail={`${overview.placementPercentage}% of cohort`}
          icon={<UserCheck className="size-4.5" />}
          href={base ? `${base}/students` : undefined}
          onClick={() => openStudents('Placed students', 'Placed and offered students in this cohort.', (student) => ['PLACED', 'OFFERED'].includes(student.placementStatus.toUpperCase()))}
        />
        <ManagementCard
          title="Unplaced Students"
          value={overview.unplaced}
          detail={`${Math.max(0, 100 - overview.placementPercentage)}% remaining`}
          icon={<UserX className="size-4.5" />}
          href={base ? `${base}/students` : undefined}
          onClick={() => openStudents('Unplaced students', 'Students who are not yet placed or offered.', (student) => !['PLACED', 'OFFERED'].includes(student.placementStatus.toUpperCase()))}
        />
      </section>

      {snapshot.skillBadges ? (
        <ConsolidatedSkillsBadgeCard
          skillBadges={snapshot.skillBadges}
          onOpen={() => setSkillsOpen(true)}
        />
      ) : null}


      <section className="grid gap-4 lg:grid-cols-3">
        <Panel
          title="Upcoming Drives"
          description="Next placement activities for the selected batch"
          icon={<CalendarDays className="size-5" />}
          exportSection={tableSectionExport(
            'Upcoming drives',
            ['Drive', 'Mode', 'Date', 'Venue', 'Status'],
            snapshot.upcomingEvents.map((event) => [
              event.title,
              event.mode.replace(/_/g, ' '),
              new Date(event.starts_at).toLocaleString(),
              event.venue || '—',
              event.status,
            ]),
            { fileBase: 'upcoming_drives' },
          )}
        >
          <div className="space-y-2">
            {snapshot.upcomingEvents.length ? (
              snapshot.upcomingEvents.map((event) => (
                <div key={event.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
                  <div className="min-w-12 rounded-lg bg-primary/10 p-2 text-center text-primary">
                    <p className="text-[10px] uppercase">{new Date(event.starts_at).toLocaleString('en', { month: 'short' })}</p>
                    <p className="tnum text-lg font-bold">{new Date(event.starts_at).getDate()}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{event.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {event.mode.replace(/_/g, ' ')} · {event.venue || new Date(event.starts_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">No upcoming drives scheduled.</p>
            )}
          </div>
        </Panel>

        <Panel
          title="Leaderboard"
          description="Top performers by live Fame XP"
          icon={<Trophy className="size-5" />}
          exportSection={tableSectionExport(
            'Leaderboard top performers',
            ['Rank', 'Student', 'Roll Number', 'Fame XP'],
            snapshot.leaderboard.map((row) => [
              String(row.rank),
              row.fullName,
              row.rollNumber,
              String(row.fameXp),
            ]),
            { fileBase: 'dashboard_leaderboard' },
          )}
        >
          <div className="space-y-2">
            {snapshot.leaderboard.length ? (
              snapshot.leaderboard.map((row) => (
                <div key={row.rollNumber} className="flex items-center gap-3 rounded-xl border border-border p-3">
                  <span className="tnum flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {row.rank}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{row.fullName}</p>
                    <p className="truncate text-xs text-muted-foreground">{row.rollNumber}</p>
                  </div>
                  <span className="tnum text-sm font-bold text-primary">{row.fameXp} XP</span>
                </div>
              ))
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No ranked students yet. Open Leaderboard after students have evaluation scores.
              </p>
            )}
            <Button asChild variant="outline" size="sm" className="mt-2 w-full">
              <a href="/public/leaderboard" target="_blank" rel="noreferrer">
                Open Leaderboard
              </a>
            </Button>
          </div>
        </Panel>

        <Panel
          title="Recent Placement Activity"
          description="Latest actions across placement operations"
          icon={<Users className="size-5" />}
          exportSection={tableSectionExport(
            'Recent placement activity',
            ['Action', 'Description', 'When'],
            snapshot.activities.map((activity) => [
              activity.action,
              activity.description || activity.action.replace(/\./g, ' '),
              new Date(activity.createdAt).toLocaleString(),
            ]),
            { fileBase: 'recent_placement_activity' },
          )}
        >
          <div className="space-y-3">
            {snapshot.activities.length ? (
              snapshot.activities.map((activity) => (
                <div key={activity.id} className="relative border-l border-border pl-4">
                  <span className="absolute -left-1 top-1 size-2 rounded-full bg-primary" />
                  <p className="text-sm font-medium">{activity.description || activity.action.replace(/\./g, ' ')}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {new Date(activity.createdAt).toLocaleString()}
                  </p>
                </div>
              ))
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">No recent activity.</p>
            )}
          </div>
        </Panel>
      </section>

      <Panel
        title="Quick Actions"
        description="Daily placement operations"
        icon={<Sparkles className="size-5" />}
      >
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {base ? (
            <>
              <Button asChild variant="outline"><PlacementLink href={`${base}/students/new`}>Add student</PlacementLink></Button>
              <Button asChild variant="outline"><PlacementLink href={`${base}/communication/new`}>New evaluation</PlacementLink></Button>
              <Button asChild variant="outline"><PlacementLink href={`${base}/operations`}>Schedule drive</PlacementLink></Button>
              <Button asChild variant="outline"><PlacementLink href={`${base}/tech-stack`}>Open tech stack</PlacementLink></Button>
            </>
          ) : null}
        </div>
      </Panel>
    </div>
  )
}

