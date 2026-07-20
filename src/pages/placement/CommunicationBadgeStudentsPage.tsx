import { useCallback, useEffect, useState } from 'react'
import { useParams, useSearch } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { CommunicationModuleNav } from '@/components/placement/CommunicationModuleNav'
import { PlacementLink } from '@/components/placement/PlacementLink'
import { PlacementShell, usePlacementPaths } from '@/components/placement/PlacementShell'
import { PlacementPageHeader } from '@/components/placement/PlacementPageHeader'
import { PlacementEmptyState } from '@/components/placement/PlacementStates'
import {
  PlacementAlerts,
  PlacementField,
  PlacementFilterCard,
  PlacementPageStack,
  PlacementSelect,
  PlacementTableCard,
} from '@/components/placement/PlacementUi'
import {
  exportCommunicationBadgeStudents,
  listCommunicationBadgeStudents,
  type CommunicationBadgeStudentRow,
} from '@/api/placement/communicationEvaluations'
import {
  COMMUNICATION_ACADEMIC_BATCH_OPTIONS,
  COMMUNICATION_BADGE_EMOJI,
  COMMUNICATION_BADGE_LABELS,
  COMMUNICATION_BRANCH_OPTIONS,
  formatCommunicationBadge,
  isCommunicationBadge,
  type CommunicationBadge,
} from '@/lib/communicationBadge'
import { canViewCommunicationModule } from '@/lib/placementNavigation'
import { useAuth } from '@/hooks/useAuth'

function readSearchParam(search: unknown, key: string): string {
  if (!search || typeof search !== 'object') return ''
  const value = (search as Record<string, unknown>)[key]
  return typeof value === 'string' ? value : ''
}

export function CommunicationBadgeStudentsPage() {
  const { placementRole } = useAuth()
  const { base } = usePlacementPaths()
  const params = useParams({ strict: false }) as { badge?: string }
  const search = useSearch({ strict: false })
  const canView = canViewCommunicationModule(placementRole)
  const badgeParam = params.badge?.toLowerCase() ?? ''
  const badge: CommunicationBadge | null = isCommunicationBadge(badgeParam) ? badgeParam : null

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<CommunicationBadgeStudentRow[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(0)
  const [filters, setFilters] = useState({
    academicBatch: readSearchParam(search, 'academicBatch'),
    branch: readSearchParam(search, 'branch'),
    search: readSearchParam(search, 'search'),
  })

  const load = useCallback(async () => {
    if (!canView || !badge) return
    setLoading(true)
    setError(null)
    try {
      const result = await listCommunicationBadgeStudents(badge, {
        academicBatch: filters.academicBatch || undefined,
        branch: filters.branch || undefined,
        search: filters.search || undefined,
        page,
        limit: 50,
      })
      setRows(result.data)
      setTotal(result.pagination.total)
      setPages(result.pagination.pages)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load students')
    } finally {
      setLoading(false)
    }
  }, [badge, canView, filters, page])

  useEffect(() => {
    void load()
  }, [load])

  const handleExport = async () => {
    if (!badge) return
    try {
      const csv = await exportCommunicationBadgeStudents(badge, {
        academicBatch: filters.academicBatch || undefined,
        branch: filters.branch || undefined,
        search: filters.search || undefined,
      })
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Download ${COMMUNICATION_BADGE_LABELS[badge]} List.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed')
    }
  }

  const title = badge
    ? `${COMMUNICATION_BADGE_EMOJI[badge]} ${COMMUNICATION_BADGE_LABELS[badge]} Students`
    : 'Badge Students'

  return (
    <PlacementShell title={title}>
      <PlacementPageHeader
        title={title}
        description="Students in this Communication Evaluation badge category."
        actions={
          <>
            {base ? (
              <Button asChild variant="outline" size="sm">
                <PlacementLink href={`${base}/communication`}>← Dashboard</PlacementLink>
              </Button>
            ) : null}
            {canView && badge ? (
              <Button type="button" variant="outline" size="sm" onClick={() => void handleExport()}>
                Download
              </Button>
            ) : null}
          </>
        }
      />

      <CommunicationModuleNav />

      {!canView ? (
        <PlacementEmptyState
          title="403 Forbidden"
          description="Only Admin, TPO, and Faculty can access Communication badge lists."
        />
      ) : !badge ? (
        <PlacementEmptyState
          title="Invalid badge"
          description="Use gold, silver, bronze, or poor."
          action={
            base ? (
              <Button asChild variant="outline" size="sm">
                <PlacementLink href={`${base}/communication`}>← Dashboard</PlacementLink>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <PlacementPageStack>
          <PlacementAlerts error={error} />

          <PlacementFilterCard
            actions={
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setPage(1)
                  void load()
                }}
              >
                Apply
              </Button>
            }
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <PlacementField label="Academic Batch">
                <PlacementSelect
                  value={filters.academicBatch}
                  onChange={(value) => {
                    setPage(1)
                    setFilters((f) => ({ ...f, academicBatch: value }))
                  }}
                >
                  <option value="">All</option>
                  {COMMUNICATION_ACADEMIC_BATCH_OPTIONS.map((batch) => (
                    <option key={batch} value={batch}>
                      {batch}
                    </option>
                  ))}
                </PlacementSelect>
              </PlacementField>
              <PlacementField label="Branch">
                <PlacementSelect
                  value={filters.branch}
                  onChange={(value) => {
                    setPage(1)
                    setFilters((f) => ({ ...f, branch: value }))
                  }}
                >
                  <option value="">All</option>
                  {COMMUNICATION_BRANCH_OPTIONS.map((branch) => (
                    <option key={branch} value={branch}>
                      {branch}
                    </option>
                  ))}
                </PlacementSelect>
              </PlacementField>
              <PlacementField label="Search">
                <input
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  value={filters.search}
                  onChange={(e) => {
                    setPage(1)
                    setFilters((f) => ({ ...f, search: e.target.value }))
                  }}
                  placeholder="Roll / name"
                />
              </PlacementField>
            </div>
          </PlacementFilterCard>

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : rows.length === 0 ? (
            <PlacementEmptyState
              title={`No ${COMMUNICATION_BADGE_LABELS[badge]} students`}
              description="No evaluated students match this badge and filter set."
            />
          ) : (
            <PlacementTableCard title={`${COMMUNICATION_BADGE_LABELS[badge]} Students (${total})`}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>S.No</TableHead>
                    <TableHead>Roll Number</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Academic Batch</TableHead>
                    <TableHead>Communication Score</TableHead>
                    <TableHead>Percentage</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Badge</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, index) => (
                    <TableRow key={row.studentProfileId}>
                      <TableCell>{(page - 1) * 50 + index + 1}</TableCell>
                      <TableCell className="font-mono text-xs">{row.rollNumber}</TableCell>
                      <TableCell>{row.fullName}</TableCell>
                      <TableCell>{row.branch || '—'}</TableCell>
                      <TableCell>{row.academicBatch || '—'}</TableCell>
                      <TableCell className="font-semibold">{row.totalScore}/250</TableCell>
                      <TableCell>{row.percentage}%</TableCell>
                      <TableCell>{row.grade}</TableCell>
                      <TableCell>{formatCommunicationBadge(row.badge)}</TableCell>
                      <TableCell>
                        {base ? (
                          <PlacementLink
                            href={`${base}/students/$id`}
                            params={{ id: row.studentProfileId }}
                            className="text-xs text-primary hover:underline"
                          >
                            View Student
                          </PlacementLink>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {pages > 1 ? (
                <div className="mt-4 flex items-center justify-between gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <p className="text-sm text-secondary">
                    Page {page} of {pages}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={page >= pages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              ) : null}
            </PlacementTableCard>
          )}
        </PlacementPageStack>
      )}
    </PlacementShell>
  )
}
