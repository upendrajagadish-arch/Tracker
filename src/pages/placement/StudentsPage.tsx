import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Trash2, Trophy } from 'lucide-react'
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
import { PlacementShell, usePlacementPaths } from '@/components/placement/PlacementShell'
import { PlacementPageHeader } from '@/components/placement/PlacementPageHeader'
import {
  CompletenessBar,
  PlacementStatusBadge,
  ReadinessStatusBadge,
} from '@/components/placement/PlacementBadges'
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
import { deleteStudent, listStudents, countActiveStudents, type StudentListFilters } from '@/api/placement/students'
import { listTechStackStudents } from '@/api/placement/techSkills'
import {
  BULK_PDF_CAP,
  buildStudentPerformanceProfile,
  listStudentIdsForPerformancePdf,
} from '@/lib/buildStudentPerformanceProfile'
import {
  downloadStudentPerformancePdf,
  downloadStudentPerformancePdfBundle,
} from '@/lib/downloadStudentPerformancePdf'
import {
  canAssignStudentBranch,
  canImportStudents,
  canManageStudents,
} from '@/lib/placementNavigation'
import { TrainingProgramCards } from '@/components/placement/TrainingProgramCards'
import { tableSectionExport } from '@/lib/analyticsExports'
import { usePassOutYearFilter } from '@/lib/placementYearFilter'
import type { TrainingYear } from '@/lib/trainingPrograms'

/** Year-wise roster while collecting registrations — training program not required. */
const ROSTER_LIMIT = 200

function defaultRosterFilters(extra: Partial<StudentListFilters> = {}): StudentListFilters {
  return {
    page: 1,
    limit: ROSTER_LIMIT,
    orderBy: 'full_name',
    orderAscending: true,
    ...extra,
  }
}

export function StudentsPage() {
  const { base, role } = usePlacementPaths()
  const canManage = canManageStudents(role)
  const canImport = canImportStudents(role)
  const canAssign = canAssignStudentBranch(role)
  const { year, setYear } = usePassOutYearFilter()
  const [filters, setFilters] = useState<StudentListFilters>(() =>
    defaultRosterFilters(year === 'all' ? {} : { graduationYear: Number(year) }),
  )
  const [rollSearch, setRollSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [pdfProgress, setPdfProgress] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [result, setResult] = useState<Awaited<ReturnType<typeof listStudents>> | null>(null)
  const [rosterTotal, setRosterTotal] = useState<number | null>(null)

  const isSearching = Boolean(filters.q?.trim())
  const activeYearLabel = filters.graduationYear != null ? String(filters.graduationYear) : 'All years'

  const applyYearFilter = useCallback((nextYear: TrainingYear | 'all', section?: string) => {
    setYear(nextYear === 'all' ? 'all' : String(nextYear) as '2027' | '2028' | '2029' | '2030')
    setRollSearch('')
    setFilters(
      defaultRosterFilters({
        graduationYear: nextYear === 'all' ? undefined : nextYear,
        // Only apply section when drilling into a training program; year roster ignores it.
        section: section?.trim() || undefined,
      }),
    )
  }, [setYear])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [page, total] = await Promise.all([
        listStudents(filters),
        countActiveStudents({
          graduationYear: filters.graduationYear,
          section: filters.section,
          // Roster KPI stays year/section scoped — ignore search so Total students never blanks.
        }),
      ])
      setResult(page)
      setRosterTotal(total)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load students')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    void load()
  }, [load])

  // Keep year roster in sync when year is changed from WorkspaceTabs / shared session filter.
  useEffect(() => {
    const nextYear = year === 'all' ? undefined : Number(year)
    setFilters((prev) => {
      if (prev.graduationYear === nextYear && !prev.section) return prev
      return defaultRosterFilters({
        graduationYear: nextYear,
        q: prev.q,
      })
    })
  }, [year])

  const applyRollSearch = (e: FormEvent) => {
    e.preventDefault()
    const roll = rollSearch.trim()
    if (!roll) {
      applyYearFilter(year === 'all' ? 'all' : (Number(year) as TrainingYear))
      return
    }
    setFilters(
      defaultRosterFilters({
        q: roll,
        graduationYear: filters.graduationYear,
      }),
    )
  }

  const clearSearch = () => {
    setRollSearch('')
    applyYearFilter(year === 'all' ? 'all' : (Number(year) as TrainingYear))
  }

  const handleDelete = async (studentId: string, label: string) => {
    if (!canManage) return
    const ok = window.confirm(
      `Delete student profile for ${label}? They will be removed from the active tracker and dashboards.`,
    )
    if (!ok) return
    setDeletingId(studentId)
    setError(null)
    setSuccess(null)
    try {
      await deleteStudent(studentId)
      setSuccess(`Deleted ${label}`)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete student')
    } finally {
      setDeletingId(null)
    }
  }

  const handleExport = async () => {
    setExporting(true)
    setError(null)
    try {
      const rows = await listTechStackStudents({
        q: filters.q,
        branch: filters.branch,
        batch: filters.batch,
      })
      const headers = [
        'Roll Number', 'Student', 'Email', 'Branch', 'Batch', 'CGPA',
        'Placement Status', 'Readiness Score', 'Top Tech Skills',
        'Verified Skills Count', 'Primary Role Interest', 'Role Readiness Level',
      ]
      const escape = (value: unknown) => {
        const text = value == null ? '' : String(value)
        return text.includes(',') || text.includes('"') || text.includes('\n')
          ? `"${text.replace(/"/g, '""')}"` : text
      }
      const csv = [
        headers.join(','),
        ...rows.map((row) => [
          row.student.roll_number, row.student.full_name, row.student.email,
          row.student.branch, row.student.batch, row.student.cgpa,
          row.student.placement_status, row.student.readiness_score,
          row.topSkills.join('; '), row.verifiedSkillsCount,
          row.primaryRoleInterest?.role_name ?? '', row.primaryRoleInterest?.readiness_level ?? '',
        ].map(escape).join(',')),
      ].join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'students-tech-stack-export.csv'
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to export students')
    } finally {
      setExporting(false)
    }
  }

  const handleBulkPdf = async () => {
    setExportingPdf(true)
    setPdfProgress('Collecting filtered students…')
    setError(null)
    try {
      const { ids, total, capped } = await listStudentIdsForPerformancePdf({
        q: filters.q,
        branch: filters.branch,
        batch: filters.batch,
        placementStatus: filters.placementStatus,
      })
      if (!ids.length) {
        setError('No students match the current filters.')
        return
      }
      if (capped) {
        setPdfProgress(
          `Preparing PDF for first ${ids.length} of ${total} students (cap ${BULK_PDF_CAP})…`,
        )
      }
      const profiles = []
      for (let i = 0; i < ids.length; i += 1) {
        setPdfProgress(`Building profile ${i + 1} of ${ids.length}…`)
        profiles.push(await buildStudentPerformanceProfile(ids[i]!))
      }
      setPdfProgress(`Rendering PDF (${profiles.length} profiles)…`)
      await downloadStudentPerformancePdfBundle(
        profiles,
        'filtered_students_performance_profiles.pdf',
        (done, n) => setPdfProgress(`Rendering PDF page set ${done} of ${n}…`),
      )
      if (capped) {
        setError(
          `Downloaded ${ids.length} of ${total} matching students (bulk PDF cap is ${BULK_PDF_CAP}). Narrow filters to export the rest.`,
        )
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to download PDF profiles')
    } finally {
      setExportingPdf(false)
      setPdfProgress(null)
    }
  }

  const handleRowPdf = async (studentId: string, rollNumber: string) => {
    setExportingPdf(true)
    setPdfProgress(`Preparing PDF for ${rollNumber}…`)
    setError(null)
    try {
      const profile = await buildStudentPerformanceProfile(studentId)
      await downloadStudentPerformancePdf(profile)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to download student PDF')
    } finally {
      setExportingPdf(false)
      setPdfProgress(null)
    }
  }

  const rows = result?.data ?? []

  return (
    <PlacementShell title="Student Tracker">
      <PlacementPageHeader
        actions={
          base ? (
            <>
              <Button asChild variant="outline" size="sm" className="gap-1.5 border-[#D27918]/40 text-[#D27918] hover:bg-[#D27918]/10">
                <a href="/public/leaderboard" target="_blank" rel="noreferrer">
                  <Trophy className="size-3.5" strokeWidth={2} />
                  Leaderboard
                </a>
              </Button>
              {canAssign ? (
                <Button asChild variant="outline" size="sm">
                  <PlacementLink href={`${base}/students/bulk-assign`}>Assign branch & year</PlacementLink>
                </Button>
              ) : null}
              {canImport ? (
                <Button asChild variant="outline" size="sm">
                  <PlacementLink href={`${base}/students/import`}>Bulk add students</PlacementLink>
                </Button>
              ) : null}
              {canManage ? (
                <>
                  <Button variant="outline" size="sm" disabled={exporting} onClick={() => void handleExport()}>
                    {exporting ? 'Exporting…' : 'Export CSV'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={exportingPdf}
                    onClick={() => void handleBulkPdf()}
                  >
                    {exportingPdf ? 'Preparing PDFs…' : 'Download PDFs'}
                  </Button>
                  <Button asChild size="sm">
                    <PlacementLink href={`${base}/students/new`}>Add student</PlacementLink>
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={exportingPdf}
                  onClick={() => void handleBulkPdf()}
                >
                  {exportingPdf ? 'Preparing PDFs…' : 'Download PDFs'}
                </Button>
              )}
            </>
          ) : null
        }
      />

      <PlacementPageStack>
        <PlacementAlerts error={error} success={success} />
        {pdfProgress ? (
          <p className="text-sm text-muted-foreground">{pdfProgress}</p>
        ) : null}

        <TrainingProgramCards
          selectedYear={year === 'all' ? 'all' : (Number(year) as TrainingYear)}
          onYearChange={(next) => applyYearFilter(next)}
          onFilter={(filter) => {
            applyYearFilter(filter.year, filter.section)
          }}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <PlacementStatCard
            label={filters.graduationYear != null ? `${filters.graduationYear} students` : 'Total students'}
            value={rosterTotal == null ? (loading ? '…' : '—') : rosterTotal}
            hint={filters.graduationYear != null ? 'Active in selected pass-out year' : 'Active roster (all years)'}
          />
          <PlacementStatCard
            label={isSearching ? 'Search matches' : `On this page · ${activeYearLabel}`}
            value={rows.length}
            hint={
              isSearching
                ? 'Roll number search'
                : filters.section
                  ? `Filtered by training · ${filters.section}`
                  : 'Year-wise roster (training program optional)'
            }
          />
        </div>

        <PlacementFilterCard>
          <form onSubmit={applyRollSearch} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <PlacementField label="Search by roll number" hint="Plain text search — no dropdown">
                <Input
                  placeholder="e.g. CS21B1001"
                  value={rollSearch}
                  onChange={(e) => setRollSearch(e.target.value)}
                  className="border-border bg-card font-mono"
                />
              </PlacementField>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button type="submit" size="sm">
                Search
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={clearSearch}>
                Clear
              </Button>
              {filters.section ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => applyYearFilter(year === 'all' ? 'all' : (Number(year) as TrainingYear))}
                >
                  Clear training filter
                </Button>
              ) : null}
            </div>
          </form>
        </PlacementFilterCard>

        <PlacementPageBody
          loading={loading}
          loadingLabel="Loading students…"
          empty={!rows.length ? (
            <PlacementEmptyState
              title={isSearching ? 'No student found' : 'No students yet'}
              description={
                isSearching
                  ? 'Try a different roll number, or clear search to see the year roster.'
                  : 'Share a registration campaign link, or bulk add students.'
              }
              action={
                canImport && base ? (
                  <Button asChild size="sm">
                    <PlacementLink href={`${base}/students/import`}>Bulk add students</PlacementLink>
                  </Button>
                ) : undefined
              }
            />
          ) : undefined}
        >
          {rows.length ? (
            <PlacementTableCard
              title={
                isSearching
                  ? 'Search results'
                  : filters.section
                    ? `${filters.section} · ${activeYearLabel}`
                    : `Students · ${activeYearLabel}`
              }
              count={rows.length}
              exportSection={tableSectionExport(
                isSearching ? 'Student roll search' : `Students ${activeYearLabel}`,
                [
                  'Roll Number',
                  'Name',
                  'Email',
                  'Branch',
                  'Academic Batch',
                  'CGPA',
                  'Status',
                  'Readiness',
                  'Profile %',
                ],
                rows.map((student) => [
                  student.roll_number,
                  student.full_name,
                  student.email || '',
                  student.branch || '',
                  student.academic_batch || student.batch || '',
                  student.cgpa == null ? '' : String(student.cgpa),
                  student.placement_status,
                  String(student.readiness_score ?? 0),
                  String(student.profile_completeness ?? 0),
                ]),
                { fileBase: isSearching ? 'student_roll_search' : `students_${activeYearLabel.replace(/\s+/g, '_')}` },
              )}
            >
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/40">
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Roll number</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Academic Batch</TableHead>
                    <TableHead>CGPA</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Readiness</TableHead>
                    <TableHead>Profile</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((student, index) => (
                    <TableRow key={student.id} className="hover:bg-muted/40">
                      <TableCell className="tnum text-xs font-bold text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{student.roll_number}</TableCell>
                      <TableCell>
                        {base ? (
                          <PlacementLink href={`${base}/students/$id`} params={{ id: student.id }} className="font-medium text-primary hover:underline">
                            {student.full_name}
                          </PlacementLink>
                        ) : student.full_name}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{student.email || '—'}</TableCell>
                      <TableCell>{student.branch || '—'}</TableCell>
                      <TableCell>{student.academic_batch || student.batch || '—'}</TableCell>
                      <TableCell>{student.cgpa ?? '—'}</TableCell>
                      <TableCell><PlacementStatusBadge status={student.placement_status} /></TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-medium">{student.readiness_score}</span>
                          <ReadinessStatusBadge status={student.readiness_status} />
                        </div>
                      </TableCell>
                      <TableCell><CompletenessBar value={student.profile_completeness} /></TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          {base ? (
                            <Button asChild variant="outline" size="sm">
                              <PlacementLink href={`${base}/students/$id`} params={{ id: student.id }}>
                                Student profile
                              </PlacementLink>
                            </Button>
                          ) : null}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={exportingPdf}
                            onClick={() => void handleRowPdf(student.id, student.roll_number)}
                          >
                            PDF
                          </Button>
                          {canManage ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="text-destructive hover:bg-destructive/10"
                              disabled={deletingId === student.id}
                              onClick={() =>
                                void handleDelete(student.id, `${student.full_name} (${student.roll_number})`)
                              }
                            >
                              <Trash2 className="size-3.5" />
                              {deletingId === student.id ? 'Deleting…' : 'Delete'}
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </PlacementTableCard>
          ) : null}
        </PlacementPageBody>
      </PlacementPageStack>
    </PlacementShell>
  )
}
