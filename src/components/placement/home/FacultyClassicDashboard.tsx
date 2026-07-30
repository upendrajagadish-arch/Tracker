import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PlacementLink } from '@/components/placement/PlacementLink'
import { usePlacementPaths } from '@/components/placement/PlacementShell'
import { PlacementPageHeader } from '@/components/placement/PlacementPageHeader'
import {
  PlacementStatusBadge,
  ReadinessStatusBadge,
} from '@/components/placement/PlacementBadges'
import { ReadinessScorePopover } from '@/components/placement/ReadinessScorePopover'
import {
  PlacementEmptyState,
  PlacementStatCard,
} from '@/components/placement/PlacementStates'
import {
  PlacementAlerts,
  PlacementField,
  PlacementFilterCard,
  PlacementPageBody,
  PlacementPageStack,
  PlacementTableCard,
} from '@/components/placement/PlacementUi'
import { TrainingProgramCards } from '@/components/placement/TrainingProgramCards'
import {
  LuxuryBarChart,
  LuxuryDonutChart,
} from '@/components/placement/charts'
import { listStudents } from '@/api/placement/students'
import { getCampaignSummary } from '@/api/placement/studentUpdateCampaigns'
import {
  TRAINING_PROGRAMS,
  resolveStudentGraduationYear,
  resolveStudentTrainingAssignment,
  type TrainingProgramId,
  type TrainingYear,
} from '@/lib/trainingPrograms'
import { usePassOutYearFilter, studentMatchesPassOutYear } from '@/lib/placementYearFilter'
import { tableSectionExport } from '@/lib/analyticsExports'

/** Previous faculty operational dashboard (stats, campaigns, table) — unchanged fields. */
export function FacultyClassicDashboard() {
  const { base } = usePlacementPaths()
  const { year, setYear, graduationYear } = usePassOutYearFilter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rollSearch, setRollSearch] = useState('')
  const [appliedRoll, setAppliedRoll] = useState('')
  const [sectionFilter, setSectionFilter] = useState<string | undefined>()
  const [students, setStudents] = useState<Awaited<ReturnType<typeof listStudents>>['data']>([])
  const [campaignSummary, setCampaignSummary] = useState<Awaited<
    ReturnType<typeof getCampaignSummary>
  > | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [result, summary] = await Promise.all([
        listStudents({
          page: 1,
          limit: 500,
          orderBy: 'full_name',
          orderAscending: true,
          q: appliedRoll || undefined,
          graduationYear,
          section: sectionFilter,
        }),
        getCampaignSummary().catch(() => null),
      ])
      setStudents(result.data.filter((student) => studentMatchesPassOutYear(student, year)))
      setCampaignSummary(summary)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load registered students')
    } finally {
      setLoading(false)
    }
  }, [appliedRoll, graduationYear, sectionFilter, year])

  useEffect(() => {
    void load()
  }, [load])

  const programCounts = useMemo(() => {
    const counts: Record<TrainingProgramId, number> = { ignite: 0, pinnacle: 0, connect: 0 }
    for (const student of students) {
      const assignment = resolveStudentTrainingAssignment(
        student.section,
        student.batch,
        student.academic_batch,
      )
      if (assignment.program) counts[assignment.program] += 1
    }
    return counts
  }, [students])

  const effectiveReadiness = useCallback(
    (student: (typeof students)[number]) => {
      const stored = Number(student.readiness_score ?? 0)
      if (stored > 0) return Math.max(0, Math.min(100, Math.round(stored)))

      const profile = Number(student.profile_completeness ?? 0)
      const cgpa = student.cgpa == null ? 0 : Math.max(0, Math.min(100, Number(student.cgpa) * 10))
      const comm = Number(student.communication_score ?? 0)
      const codeNow = Number(student.codenow_score ?? 0)
      const aptitude = Number(student.aptitude_score ?? 0)
      const verbal = Number(student.verbal_score ?? 0)
      const fallback = Math.round(
        profile * 0.42
          + cgpa * 0.24
          + comm * 0.14
          + codeNow * 0.1
          + aptitude * 0.06
          + verbal * 0.04,
      )
      return Math.max(0, Math.min(100, fallback))
    },
    [students],
  )

  const cgpaPercent = useCallback((value: number | null | undefined) => {
    if (value == null || !Number.isFinite(Number(value))) return 0
    return Math.max(0, Math.min(100, Number(value) * 10))
  }, [])

  const [cgpaBand, setCgpaBand] = useState<60 | 70 | 80 | null>(null)

  const registeredCount = students.filter((student) => student.registered_via_campaign_id).length
  const cgpaAbove60 = students.filter((student) => cgpaPercent(student.cgpa) >= 60).length
  const cgpaAbove70 = students.filter((student) => cgpaPercent(student.cgpa) >= 70).length
  const cgpaAbove80 = students.filter((student) => cgpaPercent(student.cgpa) >= 80).length
  const avgProfileScore = students.length
    ? Math.round(
        students.reduce((sum, student) => sum + Number(student.profile_completeness ?? 0), 0) /
          students.length,
      )
    : 0

  const visibleStudents = useMemo(() => {
    if (cgpaBand == null) return students
    return students.filter((student) => cgpaPercent(student.cgpa) >= cgpaBand)
  }, [cgpaBand, cgpaPercent, students])

  return (
    <div className="space-y-4">
      <PlacementPageHeader
        actions={
          base ? (
            <Button asChild size="sm">
              <PlacementLink href={`${base}/students`}>Open Student Tracker</PlacementLink>
            </Button>
          ) : null
        }
      />

      <PlacementPageStack>
        <PlacementAlerts error={error} />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <PlacementStatCard
            label={year === 'all' ? 'Students on page' : `${year} students`}
            value={students.length}
            hint={appliedRoll ? 'Matching search' : 'Active in current year scope'}
            onClick={() => setCgpaBand(null)}
          />
          <PlacementStatCard label="Campaign registered" value={registeredCount} hint="Via shared link" />
          {TRAINING_PROGRAMS.map((program) => (
            <PlacementStatCard
              key={program.id}
              label={program.label}
              value={programCounts[program.id]}
              hint="Training program"
            />
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <PlacementStatCard
            label="CGPA > 60%"
            value={cgpaAbove60}
            hint={cgpaBand === 60 ? 'Showing matching students · click again to clear' : `CGPA ≥ 6.0 · Avg profile ${avgProfileScore}%`}
            className={cgpaBand === 60 ? 'border-primary/60 ring-1 ring-primary/40' : undefined}
            onClick={() => setCgpaBand((prev) => (prev === 60 ? null : 60))}
          />
          <PlacementStatCard
            label="CGPA > 70%"
            value={cgpaAbove70}
            hint={cgpaBand === 70 ? 'Showing matching students · click again to clear' : 'CGPA ≥ 7.0'}
            className={cgpaBand === 70 ? 'border-primary/60 ring-1 ring-primary/40' : undefined}
            onClick={() => setCgpaBand((prev) => (prev === 70 ? null : 70))}
          />
          <PlacementStatCard
            label="CGPA > 80%"
            value={cgpaAbove80}
            hint={cgpaBand === 80 ? 'Showing matching students · click again to clear' : 'CGPA ≥ 8.0'}
            className={cgpaBand === 80 ? 'border-primary/60 ring-1 ring-primary/40' : undefined}
            onClick={() => setCgpaBand((prev) => (prev === 80 ? null : 80))}
          />
        </div>

        {campaignSummary ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <LuxuryDonutChart
              title="Registration funnel"
              subtitle="Campaign registrations across the placement portal"
              data={[
                { name: 'Opened', value: campaignSummary.opened, color: '#3B82F6' },
                { name: 'Completed', value: campaignSummary.completed, color: '#0ECB81' },
                { name: 'Pending', value: campaignSummary.pending, color: '#F0B90B' },
                { name: 'Expired', value: campaignSummary.expired, color: '#C45C1A' },
              ]}
              centerLabel="Regs"
              centerValue={campaignSummary.students}
            />
            <LuxuryBarChart
              title="Campaign activity"
              subtitle="Volume across campaign lifecycle states"
              data={[
                { name: 'Campaigns', value: campaignSummary.campaigns },
                { name: 'Registrations', value: campaignSummary.students },
                { name: 'Opened', value: campaignSummary.opened },
                { name: 'Completed', value: campaignSummary.completed },
                { name: 'Pending', value: campaignSummary.pending },
                { name: 'Expired', value: campaignSummary.expired },
              ]}
            />
          </div>
        ) : null}

        {base ? (
          <div className="flex justify-end">
            <Button asChild size="sm" variant="outline">
              <PlacementLink href={`${base}/student-update-campaigns`}>Open registration campaigns</PlacementLink>
            </Button>
          </div>
        ) : null}

        <TrainingProgramCards
          selectedYear={year === 'all' ? 'all' : (Number(year) as TrainingYear)}
          onYearChange={(next) => {
            setYear(next === 'all' ? 'all' : (String(next) as typeof year))
            setSectionFilter(undefined)
          }}
          onFilter={(filter) => {
            setRollSearch('')
            setAppliedRoll('')
            setYear(filter.year === 'all' ? 'all' : (String(filter.year) as typeof year))
            setSectionFilter(filter.section)
          }}
        />

        <PlacementFilterCard>
          <form
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
            onSubmit={(event) => {
              event.preventDefault()
              setAppliedRoll(rollSearch.trim())
            }}
          >
            <div className="min-w-0 flex-1">
              <PlacementField label="Search by roll number" hint="Plain text — no dropdown">
                <Input
                  className="border-border bg-card font-mono"
                  placeholder="e.g. 24ME1A0538"
                  value={rollSearch}
                  onChange={(e) => setRollSearch(e.target.value)}
                />
              </PlacementField>
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm">
                Search
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setRollSearch('')
                  setAppliedRoll('')
                }}
              >
                Clear
              </Button>
            </div>
          </form>
        </PlacementFilterCard>

        <PlacementPageBody
          loading={loading}
          loadingLabel="Loading registered students…"
          empty={
            !visibleStudents.length ? (
              <PlacementEmptyState
                title={cgpaBand != null ? `No students with CGPA > ${cgpaBand}%` : 'No registered students found'}
                description={
                  cgpaBand != null
                    ? 'Try another threshold card, or clear the filter by clicking the active card again.'
                    : 'Students who register through the shared campaign link appear here by pass-out year. Training program is optional for now.'
                }
                action={
                  cgpaBand != null ? (
                    <Button type="button" size="sm" variant="outline" onClick={() => setCgpaBand(null)}>
                      Clear CGPA filter
                    </Button>
                  ) : undefined
                }
              />
            ) : undefined
          }
        >
          {visibleStudents.length ? (
            <PlacementTableCard
              title={
                cgpaBand != null
                  ? `Students · CGPA > ${cgpaBand}%${year === 'all' ? '' : ` · ${year}`}`
                  : year === 'all'
                    ? 'Registered student details'
                    : `Registered students · ${year}`
              }
              count={visibleStudents.length}
              exportSection={tableSectionExport(
                'Faculty registered students',
                [
                  'Roll Number',
                  'Name',
                  'Email',
                  'Branch',
                  'Program',
                  'Pass-out year',
                  'CGPA',
                  'Status',
                  'Readiness',
                  'Profile score',
                ],
                visibleStudents.map((student) => {
                  const program = resolveStudentTrainingAssignment(
                    student.section,
                    student.batch,
                    student.academic_batch,
                  )
                  return [
                    student.roll_number,
                    student.full_name,
                    student.email || '',
                    student.branch || '',
                    program.program ?? (student.section || student.batch || ''),
                    String(resolveStudentGraduationYear(student) ?? ''),
                    student.cgpa == null ? '' : String(student.cgpa),
                    student.placement_status,
                    String(effectiveReadiness(student)),
                    String(student.profile_completeness ?? ''),
                  ]
                }),
              )}
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Roll</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Program</TableHead>
                    <TableHead>Year</TableHead>
                    <TableHead>CGPA</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Readiness</TableHead>
                    <TableHead>Profile score</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleStudents.map((student) => {
                    const program = resolveStudentTrainingAssignment(
                      student.section,
                      student.batch,
                      student.academic_batch,
                    )
                    return (
                      <TableRow key={student.id} className="hover:bg-muted/40">
                        <TableCell className="font-mono text-xs">{student.roll_number}</TableCell>
                        <TableCell>
                          {base ? (
                            <PlacementLink
                              href={`${base}/students/$id`}
                              params={{ id: student.id }}
                              className="font-medium text-primary hover:underline"
                            >
                              {student.full_name}
                            </PlacementLink>
                          ) : (
                            student.full_name
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {student.email || '—'}
                        </TableCell>
                        <TableCell>{student.branch || '—'}</TableCell>
                        <TableCell className="capitalize">
                          {program.program ?? (student.section || student.batch || '—')}
                        </TableCell>
                        <TableCell>{resolveStudentGraduationYear(student) ?? '—'}</TableCell>
                        <TableCell>{student.cgpa ?? '—'}</TableCell>
                        <TableCell>
                          <PlacementStatusBadge status={student.placement_status} />
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <ReadinessScorePopover
                              studentId={student.id}
                              score={effectiveReadiness(student)}
                              status={student.readiness_status}
                              profileCompleteness={student.profile_completeness}
                            />
                            <ReadinessStatusBadge status={student.readiness_status} />
                          </div>
                        </TableCell>
                        <TableCell>{Math.round(Number(student.profile_completeness ?? 0))}%</TableCell>
                        <TableCell>
                          {base ? (
                            <Button asChild variant="outline" size="sm">
                              <PlacementLink href={`${base}/students/$id`} params={{ id: student.id }}>
                                Full details
                              </PlacementLink>
                            </Button>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </PlacementTableCard>
          ) : null}
        </PlacementPageBody>
      </PlacementPageStack>
    </div>
  )
}
