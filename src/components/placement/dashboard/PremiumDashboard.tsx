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
  MessageSquareText,
  Sparkles,
  Target,
  Trophy,
  UserCheck,
  Users,
  UserX,
  Wrench,
  X,
} from 'lucide-react'
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  Tooltip,
} from 'recharts'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { PlacementLink } from '@/components/placement/PlacementLink'
import { MeasuredChart } from '@/components/placement/charts/ChartShell'
import type { DashboardSnapshot } from '@/api/placement/premiumDashboard'
import { cn } from '@/lib/utils'

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

function ReadinessProgress({
  label,
  value,
  students,
}: {
  label: string
  value: number
  students?: number
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="font-semibold">{label}</span>
        <span className="tnum text-muted-foreground">
          {value}%{students != null ? ` · ${students} students` : ''}
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-elevated">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.75, ease: 'easeOut' }}
          className="h-full rounded-full bg-gradient-to-r from-primary/70 to-primary"
        />
      </div>
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
}: {
  title: string
  description: string
  icon: ReactNode
  children: ReactNode
  className?: string
  onDetails?: () => void
}) {
  return (
    <section className={cn('placement-glass rounded-2xl p-5', className)}>
      <div className="mb-5 flex items-start gap-3">
        <span className="rounded-xl bg-primary/10 p-2.5 text-primary">{icon}</span>
        <div>
          <h2 className="text-base font-bold">{title}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>
        {onDetails ? (
          <Button type="button" variant="ghost" size="sm" className="ml-auto shrink-0 text-primary" onClick={onDetails}>
            View details
          </Button>
        ) : null}
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
  const { overview, management } = snapshot
  const managementHref = base ? `${base}/operations` : undefined
  const readinessSpark = snapshot.overview.readinessDistribution
  const radarData = [
    { subject: 'Tech', score: snapshot.overall.tech },
    { subject: 'Communication', score: snapshot.overall.communication },
    { subject: 'Confidence', score: snapshot.communication.confidence },
    { subject: 'Presentation', score: snapshot.communication.presentation },
    { subject: 'GD', score: snapshot.communication.groupDiscussion },
    { subject: 'HR', score: snapshot.communication.hrReadiness },
  ]
  const openStudents = (
    title: string,
    description: string,
    predicate: (student: DashboardSnapshot['studentDetails'][number]) => boolean,
  ) => {
    const rows = snapshot.studentDetails
      .filter(predicate)
      .sort((a, b) => b.readinessScore - a.readinessScore)
      .map((student, index) => [
        String(index + 1),
        student.rollNumber,
        student.fullName,
        student.branch,
        `${student.readinessScore}%`,
        student.placementStatus.replace(/_/g, ' '),
      ])
    setDetail({
      title,
      description,
      columns: ['S.No', 'Roll Number', 'Student', 'Branch', 'Readiness', 'Status'],
      rows,
    })
  }

  return (
    <div className="space-y-5">
      {detail ? <DetailModal detail={detail} onClose={() => setDetail(null)} /> : null}
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

      <section className="grid gap-4 xl:grid-cols-3">
        <Panel
          title="Tech Stack Readiness"
          description="Verified cohort proficiency across role-critical technologies"
          icon={<Wrench className="size-5" />}
          onDetails={() =>
            setDetail({
              title: 'Tech stack readiness',
              description: 'Cohort coverage and normalized readiness by technology group.',
              columns: ['Technology', 'Readiness', 'Students'],
              rows: snapshot.techReadiness.map((row) => [row.name, `${row.score}%`, String(row.students)]),
            })
          }
        >
          <div className="space-y-4">
            {snapshot.techReadiness.map((row) => (
              <ReadinessProgress key={row.name} label={row.name} value={row.score} students={row.students} />
            ))}
          </div>
        </Panel>

        <Panel
          title="Communication Readiness"
          description="Structured assessment of placement-facing communication skills"
          icon={<MessageSquareText className="size-5" />}
          onDetails={() =>
            setDetail({
              title: 'Communication readiness',
              description: 'Latest communication evaluation for each student in the selected batch.',
              columns: ['S.No', 'Roll Number', 'Student', 'Score'],
              rows: snapshot.communicationStudents
                .sort((a, b) => b.percentage - a.percentage)
                .map((student, index) => [
                  String(index + 1),
                  student.rollNumber,
                  student.fullName,
                  `${student.percentage}%`,
                ]),
            })
          }
        >
          <div className="mb-5 flex items-center justify-between rounded-xl border border-border bg-background/50 p-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Communication score</p>
              <p className="tnum mt-1 text-3xl font-bold text-primary">{snapshot.communication.score}%</p>
            </div>
            <ProgressRing value={snapshot.communication.score} />
          </div>
          <div className="space-y-4">
            <ReadinessProgress label="Interview confidence" value={snapshot.communication.confidence} />
            <ReadinessProgress label="Presentation skills" value={snapshot.communication.presentation} />
            <ReadinessProgress label="Group discussion" value={snapshot.communication.groupDiscussion} />
            <ReadinessProgress label="HR readiness" value={snapshot.communication.hrReadiness} />
          </div>
        </Panel>

        <Panel
          title="Overall Readiness Comparison"
          description="Technical versus communication placement readiness"
          icon={<Sparkles className="size-5" />}
          onDetails={() =>
            setDetail({
              title: 'Overall readiness comparison',
              description: snapshot.overall.recommendation,
              columns: ['Readiness Dimension', 'Score'],
              rows: radarData.map((row) => [row.subject, `${row.score}%`]),
            })
          }
        >
          <MeasuredChart height={230}>
            {(width) => (
              <RadarChart width={width} height={230} data={radarData}>
                <PolarGrid stroke="var(--border)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} />
                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                <Radar
                  dataKey="score"
                  stroke="var(--brand)"
                  fill="var(--brand)"
                  fillOpacity={0.25}
                  animationDuration={800}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--popover)',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                  }}
                />
              </RadarChart>
            )}
          </MeasuredChart>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg border border-border bg-background/50 p-2 text-center">
              <p className="text-[10px] uppercase text-muted-foreground">Tech</p>
              <p className="tnum text-lg font-bold">{snapshot.overall.tech}%</p>
            </div>
            <div className="rounded-lg border border-border bg-background/50 p-2 text-center">
              <p className="text-[10px] uppercase text-muted-foreground">Communication</p>
              <p className="tnum text-lg font-bold">{snapshot.overall.communication}%</p>
            </div>
            <div className="rounded-lg border border-primary/30 bg-primary/10 p-2 text-center">
              <p className="text-[10px] uppercase text-primary">Overall</p>
              <p className="tnum text-lg font-bold text-primary">{snapshot.overall.score}%</p>
            </div>
          </div>
          <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-primary">Readiness insight</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {snapshot.overall.recommendation}
            </p>
          </div>
        </Panel>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Panel
          title="Upcoming Drives"
          description="Next placement activities for the selected batch"
          icon={<CalendarDays className="size-5" />}
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
          title="Hall of Fame"
          description="Top performers by live Fame XP"
          icon={<Trophy className="size-5" />}
        >
          <div className="space-y-2">
            {snapshot.leaderboard.map((row) => (
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
            ))}
            <Button asChild variant="outline" size="sm" className="mt-2 w-full">
              <a href="/public/leaderboard" target="_blank" rel="noreferrer">Open Hall of Fame</a>
            </Button>
          </div>
        </Panel>

        <Panel
          title="Recent Placement Activity"
          description="Latest actions across placement operations"
          icon={<Users className="size-5" />}
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
              <Button asChild variant="outline"><PlacementLink href={`${base}/reports`}>Open analytics</PlacementLink></Button>
            </>
          ) : null}
        </div>
      </Panel>
    </div>
  )
}

