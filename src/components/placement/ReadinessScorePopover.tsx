'use client'

import { useEffect, useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  getLatestReadinessSnapshot,
  type ReadinessSnapshotRow,
} from '@/api/placement/readiness'
import { READINESS_WEIGHTS } from '@/lib/placementReadiness'
import { formatEnumLabel } from '@/components/placement/PlacementUi'
import { cn } from '@/lib/utils'

const PILLARS: Array<{
  key: keyof typeof READINESS_WEIGHTS
  label: string
  scoreKey: keyof Pick<
    ReadinessSnapshotRow,
    | 'technical_score'
    | 'communication_score'
    | 'resume_score'
    | 'tech_stack_score'
    | 'profile_score'
    | 'academic_score'
  >
  color: string
}> = [
  { key: 'profile', label: 'Profile', scoreKey: 'profile_score', color: '#EC4899' },
  { key: 'resume', label: 'Resume', scoreKey: 'resume_score', color: '#F59E0B' },
  { key: 'technical', label: 'Coding / tech', scoreKey: 'technical_score', color: '#3B82F6' },
  { key: 'academic', label: 'Academic', scoreKey: 'academic_score', color: '#06B6D4' },
  { key: 'techStack', label: 'Skills', scoreKey: 'tech_stack_score', color: '#10B981' },
  { key: 'communication', label: 'Communication', scoreKey: 'communication_score', color: '#8B5CF6' },
]

function readinessTone(score: number) {
  if (score >= 75) return 'text-[#0ECB81]'
  if (score >= 50) return 'text-[#FF7A00]'
  return 'text-[#C45C1A]'
}

function ringColor(pct: number) {
  if (pct >= 75) return '#0ECB81'
  if (pct >= 50) return '#F59E0B'
  if (pct >= 25) return '#FF7A00'
  return '#EF4444'
}

function CompletionRing({ value, size = 88 }: { value: number; size?: number }) {
  const pct = Math.min(100, Math.max(0, Math.round(value)))
  const stroke = 8
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c - (pct / 100) * c
  const color = ringColor(pct)

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-muted/40"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-500 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="tnum text-lg font-bold leading-none" style={{ color }}>
          {pct}%
        </span>
        <span className="mt-0.5 text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
          Profile
        </span>
      </div>
    </div>
  )
}

function PillarBar({
  label,
  score,
  weight,
  color,
}: {
  label: string
  score: number
  weight: number
  color: string
}) {
  const pct = Math.min(100, Math.max(0, Math.round(score)))
  const weightPct = Math.round(weight * 100)
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2 text-[11px]">
        <span className="font-medium text-foreground">{label}</span>
        <span className="tnum text-muted-foreground">
          {pct}
          <span className="opacity-60"> · {weightPct}%</span>
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

export function ReadinessScorePopover({
  studentId,
  score,
  status,
  profileCompleteness,
  className,
  showPts = true,
  autoRefresh = false,
  onScoreChange,
}: {
  studentId: string
  score: number | null | undefined
  status?: string | null
  profileCompleteness?: number | null
  className?: string
  showPts?: boolean
  /** Refresh readiness as soon as the control mounts (no click needed). */
  autoRefresh?: boolean
  onScoreChange?: (next: {
    readinessScore: number
    readinessStatus: string
    profileCompleteness: number
  }) => void
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [snapshot, setSnapshot] = useState<ReadinessSnapshotRow | null>(null)
  const [liveScore, setLiveScore] = useState(Number(score ?? 0))
  const [liveStatus, setLiveStatus] = useState(status)
  const [liveCompletion, setLiveCompletion] = useState(Number(profileCompleteness ?? 0))

  useEffect(() => {
    setLiveScore(Number(score ?? 0))
  }, [score])
  useEffect(() => {
    setLiveStatus(status)
  }, [status])
  useEffect(() => {
    setLiveCompletion(Number(profileCompleteness ?? 0))
  }, [profileCompleteness])

  const displayScore = Math.round(Number(snapshot?.overall_score ?? liveScore ?? 0))
  const displayStatus = snapshot?.readiness_status ?? liveStatus
  const completion = Number(snapshot?.profile_score ?? liveCompletion ?? 0)

  useEffect(() => {
    if (!studentId) return
    if (!autoRefresh && !open) return
    let cancelled = false
    setLoading(true)
    void (async () => {
      try {
        const { refreshReadinessResult } = await import('@/api/placement/readiness')
        const refreshed = await refreshReadinessResult(studentId)
        const latest = await getLatestReadinessSnapshot(studentId)
        if (cancelled) return
        setSnapshot(latest)
        if (refreshed) {
          setLiveScore(refreshed.readinessScore)
          setLiveStatus(refreshed.readinessStatus)
          setLiveCompletion(refreshed.profileCompleteness)
          onScoreChange?.({
            readinessScore: refreshed.readinessScore,
            readinessStatus: refreshed.readinessStatus,
            profileCompleteness: refreshed.profileCompleteness,
          })
        }
      } catch {
        if (!cancelled) setSnapshot(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [autoRefresh, onScoreChange, open, studentId])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'tnum inline-flex items-baseline gap-0.5 rounded-sm text-sm font-bold underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A00]/50',
            readinessTone(displayScore),
            className,
          )}
          aria-label={`Readiness ${displayScore}%. Show score breakdown.`}
        >
          {displayScore}
          {showPts ? (
            <span className="ml-0.5 text-[10px] font-semibold opacity-70">%</span>
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[300px] border-border/80 bg-popover p-3.5 shadow-lg"
      >
        <div className="flex items-start gap-3">
          <CompletionRing value={completion} />
          <div className="min-w-0 flex-1 pt-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Placement readiness
            </p>
            <p className={cn('tnum text-2xl font-bold leading-none', readinessTone(displayScore))}>
              {displayScore}%
            </p>
            {displayStatus ? (
              <p className="mt-1 text-xs text-muted-foreground">
                {formatEnumLabel(displayStatus)}
              </p>
            ) : null}
            {loading ? (
              <p className="mt-1 text-[10px] text-muted-foreground">Updating…</p>
            ) : null}
          </div>
        </div>

        <div className="mt-3 space-y-2 border-t border-border/60 pt-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            How the score is calculated
          </p>
          {PILLARS.map((pillar) => (
            <PillarBar
              key={pillar.key}
              label={pillar.label}
              score={Number(snapshot?.[pillar.scoreKey] ?? 0)}
              weight={READINESS_WEIGHTS[pillar.key]}
              color={pillar.color}
            />
          ))}
        </div>

        <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">
          Scans the student profile for LinkedIn, coding platforms, resume, CGPA, skills, and projects.
          Formal tech-stack and communication evaluations boost the score when present but are not required.
        </p>
      </PopoverContent>
    </Popover>
  )
}
