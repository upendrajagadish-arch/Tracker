import { useEffect, useMemo, useRef, useState } from 'react'
import { Download, Users, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  listStudentsForTrainingYears,
  programBatchStudentsToCsv,
  type ProgramBatchStudent,
} from '@/api/placement/students'
import {
  PINNACLE_BATCHES,
  TRAINING_PROGRAMS,
  TRAINING_YEARS,
  pinnacleBatchLabel,
  resolveStudentGraduationYear,
  resolveStudentTrainingAssignment,
  type PinnacleBatchNumber,
  type TrainingProgram,
  type TrainingProgramId,
  type TrainingYear,
} from '@/lib/trainingPrograms'

export interface TrainingProgramFilter {
  year: TrainingYear
  program: TrainingProgramId
  pinnacleBatch?: PinnacleBatchNumber
  section?: string
}

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function studentMetrics(students: ProgramBatchStudent[]) {
  const placed = students.filter((student) =>
    ['PLACED', 'OFFERED'].includes(String(student.placement_status || '').toUpperCase()),
  ).length
  const avgReadiness = students.length
    ? Math.round(students.reduce((sum, student) => sum + Number(student.readiness_score || 0), 0) / students.length)
    : 0
  const avgCgpaPool = students.filter((student) => student.cgpa != null)
  const avgCgpa = avgCgpaPool.length
    ? (avgCgpaPool.reduce((sum, student) => sum + Number(student.cgpa), 0) / avgCgpaPool.length).toFixed(2)
    : '—'
  const eligible = students.filter((student) => Number(student.readiness_score || 0) >= 60).length
  return { placed, avgReadiness, avgCgpa, eligible }
}

function filterYearStudents(students: ProgramBatchStudent[], year: TrainingYear) {
  return students.filter((student) => resolveStudentGraduationYear(student) === year)
}

function filterProgramStudents(
  students: ProgramBatchStudent[],
  year: TrainingYear,
  programId: TrainingProgramId,
) {
  return filterYearStudents(students, year).filter((student) => {
    const assignment = resolveStudentTrainingAssignment(student.section)
    return assignment.program === programId
  })
}

function ProgramCard({
  program,
  year,
  count,
  onOpen,
}: {
  program: TrainingProgram
  year: TrainingYear
  count: number
  onOpen: () => void
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="placement-glass group relative overflow-hidden rounded-2xl border border-soft p-5 text-left transition hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      style={{ boxShadow: `0 18px 50px -34px ${program.accent}88` }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-20 transition group-hover:opacity-35"
        style={{
          background: `radial-gradient(circle at 90% 10%, ${program.accent}, transparent 45%)`,
        }}
      />
      <div className="relative space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Year {year} · Training program
            </p>
            <h3 className="mt-1 font-heading text-2xl font-bold tracking-tight" style={{ color: program.accent }}>
              {program.label}
            </h3>
          </div>
          <span className="flex size-10 items-center justify-center rounded-xl border border-border bg-background/50">
            <Users className="size-4" style={{ color: program.accent }} />
          </span>
        </div>
        <p className="text-sm text-secondary">{program.tagline}</p>
        <div className="flex flex-wrap items-end justify-between gap-2 border-t border-border/70 pt-3">
          <div>
            <p className="tnum text-3xl font-bold text-foreground">{count}</p>
            <p className="text-xs text-muted-foreground">Students</p>
          </div>
          <p className="text-xs font-medium text-primary">
            {program.id === 'pinnacle' ? 'Open Batch 1–4 dashboard' : 'Open program dashboard'}
          </p>
        </div>
      </div>
    </button>
  )
}

function DashboardStrip({ students }: { students: ProgramBatchStudent[] }) {
  const metrics = studentMetrics(students)
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {[
        { label: 'Students', value: students.length },
        { label: 'Placed / offered', value: metrics.placed },
        { label: 'Avg readiness', value: metrics.avgReadiness },
        { label: 'Avg CGPA', value: metrics.avgCgpa },
      ].map((item) => (
        <div key={item.label} className="rounded-xl border border-border bg-background/40 px-3 py-2">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{item.label}</p>
          <p className="tnum mt-1 text-xl font-bold text-primary">{item.value}</p>
        </div>
      ))}
    </div>
  )
}

function StudentPreviewList({ students }: { students: ProgramBatchStudent[] }) {
  const preview = students.slice(0, 8)
  if (!students.length) {
    return <p className="px-2 py-8 text-center text-sm text-muted-foreground">No students in this group yet.</p>
  }
  return (
    <>
      <ul className="space-y-2">
        {preview.map((student) => (
          <li key={student.id} className="rounded-xl border border-border/70 bg-background/40 px-3 py-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{student.full_name}</p>
                <p className="font-mono text-[11px] text-primary">{student.roll_number}</p>
              </div>
              <span className="tnum shrink-0 text-xs font-bold text-muted-foreground">{student.readiness_score}</span>
            </div>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {student.branch || 'Branch n/a'} · {student.section || 'Section n/a'} ·{' '}
              {student.placement_status?.replace(/_/g, ' ') || 'Status n/a'}
              {student.cgpa != null ? ` · CGPA ${student.cgpa}` : ''}
            </p>
          </li>
        ))}
      </ul>
      {students.length > preview.length ? (
        <p className="mt-3 text-center text-xs text-muted-foreground">
          +{students.length - preview.length} more in downloadable list
        </p>
      ) : null}
    </>
  )
}

function BatchDetailCard({
  title,
  students,
  accent,
  onOpenTracker,
}: {
  title: string
  students: ProgramBatchStudent[]
  accent: string
  onOpenTracker?: () => void
}) {
  const metrics = studentMetrics(students)
  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-soft bg-card/90">
      <div className="border-b border-border px-4 py-3" style={{ boxShadow: `inset 3px 0 0 ${accent}` }}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h4 className="font-heading text-lg font-bold">{title}</h4>
            <p className="text-xs text-muted-foreground">
              {students.length} students · {metrics.placed} placed/offered · avg readiness {metrics.avgReadiness}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {onOpenTracker ? (
              <Button type="button" size="sm" variant="outline" onClick={onOpenTracker}>
                Open in tracker
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!students.length}
              onClick={() =>
                downloadCsv(programBatchStudentsToCsv(students), `${title.replace(/[^\w-]+/g, '_')}_students.csv`)
              }
            >
              <Download className="size-3.5" />
              Download list
            </Button>
          </div>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <StudentPreviewList students={students} />
      </div>
    </div>
  )
}

function ProgramDashboardModal({
  program,
  year,
  students,
  onClose,
  onFilter,
}: {
  program: TrainingProgram
  year: TrainingYear
  students: ProgramBatchStudent[]
  onClose: () => void
  onFilter?: (filter: TrainingProgramFilter) => void
}) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const isPinnacle = program.id === 'pinnacle'

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key !== 'Tab') return
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]),a[href],[tabindex]:not([tabindex="-1"])',
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
    window.addEventListener('keydown', onKeyDown)
    requestAnimationFrame(() => dialogRef.current?.querySelector<HTMLElement>('button')?.focus())
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      previousFocus?.focus()
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`${program.label} ${year} dashboard`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={dialogRef}
        className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-primary/35 bg-[#0B0E11] shadow-[0_0_55px_-22px_rgba(210,121,24,0.9)]"
      >
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-heading text-xl font-bold" style={{ color: program.accent }}>
              {program.label} · {year}
            </h3>
            <p className="text-xs text-muted-foreground">
              {isPinnacle
                ? 'Batch 1–4 dashboard with student details and downloadable lists'
                : `${program.tagline} · student details and download`}
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!students.length}
            onClick={() => downloadCsv(programBatchStudentsToCsv(students), `${program.id}_${year}_students.csv`)}
          >
            <Download className="size-3.5" />
            Download all
          </Button>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label={`Close ${program.label}`}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          <DashboardStrip students={students} />

          {isPinnacle ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {PINNACLE_BATCHES.map((batch) => {
                const rows = students.filter((student) => {
                  const assignment = resolveStudentTrainingAssignment(student.section)
                  return assignment.pinnacleBatch === batch
                })
                return (
                  <BatchDetailCard
                    key={batch}
                    title={pinnacleBatchLabel(batch)}
                    students={rows}
                    accent={program.accent}
                    onOpenTracker={
                      onFilter
                        ? () => {
                            onFilter({
                              year,
                              program: 'pinnacle',
                              pinnacleBatch: batch,
                              section: pinnacleBatchLabel(batch),
                            })
                            onClose()
                          }
                        : undefined
                    }
                  />
                )
              })}
            </div>
          ) : (
            <BatchDetailCard
              title={`${program.label} students`}
              students={students}
              accent={program.accent}
              onOpenTracker={
                onFilter
                  ? () => {
                      onFilter({
                        year,
                        program: program.id,
                        section: program.label,
                      })
                      onClose()
                    }
                  : undefined
              }
            />
          )}
        </div>
      </div>
    </div>
  )
}

export function TrainingProgramCards({
  onFilter,
}: {
  onFilter?: (filter: TrainingProgramFilter) => void
}) {
  const [students, setStudents] = useState<ProgramBatchStudent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [year, setYear] = useState<TrainingYear>(TRAINING_YEARS[0])
  const [openProgramId, setOpenProgramId] = useState<TrainingProgramId | null>(null)

  useEffect(() => {
    let active = true
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const rows = await listStudentsForTrainingYears([...TRAINING_YEARS])
        if (active) setStudents(rows)
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : 'Failed to load training programs')
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  const yearStudents = useMemo(() => filterYearStudents(students, year), [students, year])

  const counts = useMemo(() => {
    const next: Record<TrainingProgramId, number> = { ignite: 0, pinnacle: 0, connect: 0 }
    for (const program of TRAINING_PROGRAMS) {
      next[program.id] = filterProgramStudents(students, year, program.id).length
    }
    return next
  }, [students, year])

  const openProgram = openProgramId
    ? TRAINING_PROGRAMS.find((program) => program.id === openProgramId) ?? null
    : null

  const openStudents = openProgram ? filterProgramStudents(students, year, openProgram.id) : []

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-heading text-lg font-bold tracking-tight">Training programs</h2>
          <p className="text-sm text-secondary">
            Choose a graduation year, then open Ignite, Pinnacle, or Connect. Pinnacle shows Batch 1–4.
          </p>
        </div>
        {loading ? <p className="text-xs text-muted-foreground">Loading cohort counts…</p> : null}
      </div>

      <div className="flex w-full max-w-full gap-1 overflow-x-auto rounded-card border border-soft bg-elevated p-1">
        {TRAINING_YEARS.map((tabYear) => {
          const active = tabYear === year
          const total = filterYearStudents(students, tabYear).length
          return (
            <button
              key={tabYear}
              type="button"
              onClick={() => setYear(tabYear)}
              className={`min-w-[5.5rem] flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-background/60 hover:text-foreground'
              }`}
            >
              <span className="block">{tabYear}</span>
              <span className={`tnum block text-[10px] ${active ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                {total} students
              </span>
            </button>
          )
        })}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <DashboardStrip students={yearStudents} />

      <div className="grid gap-4 md:grid-cols-3">
        {TRAINING_PROGRAMS.map((program) => (
          <ProgramCard
            key={program.id}
            program={program}
            year={year}
            count={counts[program.id]}
            onOpen={() => setOpenProgramId(program.id)}
          />
        ))}
      </div>

      {openProgram ? (
        <ProgramDashboardModal
          program={openProgram}
          year={year}
          students={openStudents}
          onClose={() => setOpenProgramId(null)}
          onFilter={onFilter}
        />
      ) : null}
    </section>
  )
}
