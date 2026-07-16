import { useCallback, useEffect, useState } from 'react'
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
  PLACEMENT_STATUSES,
  ReadinessStatusBadge,
} from '@/components/placement/PlacementBadges'
import {
  PlacementEmptyState,
  PlacementStatCard,
} from '@/components/placement/PlacementStates'
import {
  LuxuryBarChart,
  LuxuryDonutChart,
} from '@/components/placement/charts'
import {
  PlacementAlerts,
  PlacementField,
  PlacementFilterCard,
  PlacementPageBody,
  PlacementPageStack,
  PlacementPaginationBar,
  PlacementSelect,
  PlacementTableCard,
} from '@/components/placement/PlacementUi'
import { listStudents, type StudentListFilters } from '@/api/placement/students'
import { listTechStackStudents } from '@/api/placement/techSkills'
import {
  canAssignStudentBranch,
  canImportStudents,
  canManageStudents,
} from '@/lib/placementNavigation'

export function StudentsPage() {
  const { base, role } = usePlacementPaths()
  const canManage = canManageStudents(role)
  const canImport = canImportStudents(role)
  const canAssign = canAssignStudentBranch(role)
  const [filters, setFilters] = useState<StudentListFilters>({ page: 1, limit: 20 })
  const [draft, setDraft] = useState({ q: '', branch: '', batch: '', placementStatus: '' })
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<Awaited<ReturnType<typeof listStudents>> | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setResult(await listStudents(filters))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load students')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    void load()
  }, [load])

  const applyFilters = (e: React.FormEvent) => {
    e.preventDefault()
    setFilters({
      page: 1,
      limit: 20,
      q: draft.q || undefined,
      branch: draft.branch || undefined,
      batch: draft.batch || undefined,
      placementStatus: draft.placementStatus || undefined,
    })
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

  const summary = result?.data
  const eligible = summary?.filter((s) => s.is_placement_eligible).length ?? 0
  const withCgpa = summary?.filter((s) => s.cgpa != null) ?? []
  const avgCgpa = withCgpa.length
    ? (withCgpa.reduce((sum, s) => sum + Number(s.cgpa), 0) / withCgpa.length).toFixed(2)
    : '—'

  return (
    <PlacementShell title="Student Tracker">
      <PlacementPageHeader
        title="Student Tracker"
        description="Search students, bulk add records, assign branch and year, and open full dossiers."
        actions={
          base ? (
            <>
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
                  <Button asChild size="sm">
                    <PlacementLink href={`${base}/students/new`}>Add student</PlacementLink>
                  </Button>
                </>
              ) : null}
            </>
          ) : null
        }
      />

      <PlacementPageStack>
        <PlacementAlerts error={error} />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <PlacementStatCard label="Total students" value={result?.pagination.total ?? '—'} hint="Matching filters" />
          <PlacementStatCard label="Eligible on page" value={eligible} />
          <PlacementStatCard label="Average CGPA" value={avgCgpa} hint="Current page" />
          <PlacementStatCard label="Incomplete profiles" value={summary?.filter((s) => s.profile_completeness < 70).length ?? '—'} hint="Below 70%" />
        </div>

        {summary?.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <LuxuryDonutChart
              title="Profile completeness"
              subtitle="Complete vs incomplete profiles on this page"
              data={[
                {
                  name: 'Complete (≥70%)',
                  value: summary.filter((s) => s.profile_completeness >= 70).length,
                  color: '#0ECB81',
                },
                {
                  name: 'Incomplete (<70%)',
                  value: summary.filter((s) => s.profile_completeness < 70).length,
                  color: '#F6465D',
                },
              ]}
              centerLabel="Page"
              centerValue={summary.length}
            />
            <LuxuryBarChart
              title="Eligibility snapshot"
              subtitle="Eligible students vs incomplete profiles"
              data={[
                { name: 'Eligible', value: eligible, color: '#F0B90B' },
                {
                  name: 'Incomplete',
                  value: summary.filter((s) => s.profile_completeness < 70).length,
                  color: '#F6465D',
                },
                {
                  name: 'Total page',
                  value: summary.length,
                  color: '#3B82F6',
                },
              ]}
            />
          </div>
        ) : null}

        <PlacementFilterCard>
          <form onSubmit={applyFilters} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <PlacementField label="Search" hint="Name, roll number, or email">
              <Input placeholder="e.g. CS21B1001" value={draft.q} onChange={(e) => setDraft((d) => ({ ...d, q: e.target.value }))} className="border-border bg-card" />
            </PlacementField>
            <PlacementField label="Branch">
              <Input placeholder="e.g. CSE" value={draft.branch} onChange={(e) => setDraft((d) => ({ ...d, branch: e.target.value }))} className="border-border bg-card" />
            </PlacementField>
            <PlacementField label="Academic Batch">
              <Input placeholder="e.g. 2023-2027" value={draft.batch} onChange={(e) => setDraft((d) => ({ ...d, batch: e.target.value }))} className="border-border bg-card" />
            </PlacementField>
            <PlacementField label="Placement status">
              <PlacementSelect value={draft.placementStatus} onChange={(value) => setDraft((d) => ({ ...d, placementStatus: value }))}>
                <option value="">All statuses</option>
                {PLACEMENT_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
              </PlacementSelect>
            </PlacementField>
            <div className="flex items-end gap-2">
              <Button type="submit" size="sm">Apply filters</Button>
              <Button type="button" size="sm" variant="outline" onClick={() => { setDraft({ q: '', branch: '', batch: '', placementStatus: '' }); setFilters({ page: 1, limit: 20 }) }}>
                Clear
              </Button>
            </div>
          </form>
        </PlacementFilterCard>

        <PlacementPageBody
          loading={loading}
          loadingLabel="Loading students…"
          empty={!result?.data.length ? (
            <PlacementEmptyState
              title="No students found"
              description="Bulk add students or adjust filters to get started."
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
          {result?.data.length ? (
            <PlacementTableCard
              title="Students"
              count={result.pagination.total}
              footer={
                <PlacementPaginationBar
                  page={result.pagination.page}
                  pages={result.pagination.pages}
                  onPrevious={() => setFilters((f) => ({ ...f, page: Math.max(1, (f.page ?? 1) - 1) }))}
                  onNext={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) + 1 }))}
                />
              }
            >
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/40">
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
                  {result.data.map((student) => (
                    <TableRow key={student.id} className="hover:bg-muted/40">
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
                        {base ? (
                          <Button asChild variant="outline" size="sm">
                            <PlacementLink href={`${base}/students/$id`} params={{ id: student.id }}>Student profile</PlacementLink>
                          </Button>
                        ) : null}
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
