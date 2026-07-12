import { useCallback, useEffect, useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { PlacementShell } from '@/components/placement/PlacementShell'
import { PlacementPageHeader } from '@/components/placement/PlacementPageHeader'
import { ModuleStatusBadge } from '@/components/placement/PlacementBadges'
import {
  PlacementAlerts,
  PlacementField,
  PlacementFilterCard,
  PlacementPageBody,
  PlacementPageStack,
  PlacementPaginationBar,
  PlacementTableCard,
  formatEnumLabel,
} from '@/components/placement/PlacementUi'
import { PlacementEmptyState } from '@/components/placement/PlacementStates'
import { listAuditLogs, type AuditLogFilters } from '@/api/placement/auditLogs'
import { useAuth } from '@/hooks/useAuth'

export function AuditLogsPage() {
  const { placementRole } = useAuth()
  const canView = placementRole === 'admin' || placementRole === 'tpo'
  const [filters, setFilters] = useState<AuditLogFilters>({ page: 1, limit: 30 })
  const [draft, setDraft] = useState({ action: '', entityType: '' })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<Awaited<ReturnType<typeof listAuditLogs>> | null>(null)

  const load = useCallback(async () => {
    if (!canView) return
    setLoading(true)
    setError(null)
    try {
      setResult(await listAuditLogs(filters))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load audit logs')
    } finally {
      setLoading(false)
    }
  }, [canView, filters])

  useEffect(() => {
    void load()
  }, [load])

  const applyFilters = (e: React.FormEvent) => {
    e.preventDefault()
    setFilters({
      page: 1,
      limit: 30,
      action: draft.action || undefined,
      entityType: draft.entityType || undefined,
    })
  }

  return (
    <PlacementShell title="Audit Logs">
      <PlacementPageHeader
        title="Audit Logs"
        description="Track placement actions across students, resumes, tech stack, and reports."
      />

      {!canView ? (
        <PlacementEmptyState
          title="No audit log access"
          description="Audit logs are available to Super Admin and TPO/Admin only."
        />
      ) : (
        <PlacementPageStack>
          <PlacementAlerts error={error} />

          <PlacementFilterCard>
            <form onSubmit={applyFilters} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <PlacementField label="Action contains" hint="e.g. tech_skill, resume, student">
                <Input
                  className="border-border bg-card"
                  placeholder="Filter by action"
                  value={draft.action}
                  onChange={(e) => setDraft((d) => ({ ...d, action: e.target.value }))}
                />
              </PlacementField>
              <PlacementField label="Entity type" hint="e.g. student_profile, tech_skill">
                <Input
                  className="border-border bg-card"
                  placeholder="Filter by entity"
                  value={draft.entityType}
                  onChange={(e) => setDraft((d) => ({ ...d, entityType: e.target.value }))}
                />
              </PlacementField>
              <div className="flex items-end gap-2">
                <Button type="submit" size="sm">Apply filters</Button>
                <Button type="button" size="sm" variant="outline" onClick={() => { setDraft({ action: '', entityType: '' }); setFilters({ page: 1, limit: 30 }) }}>
                  Clear
                </Button>
              </div>
            </form>
          </PlacementFilterCard>

          <PlacementPageBody
            loading={loading}
            loadingLabel="Loading audit logs…"
            empty={!result?.data.length ? (
              <PlacementEmptyState title="No audit entries" description="Actions will appear here as staff use placement modules." />
            ) : undefined}
          >
            {result?.data.length ? (
              <PlacementTableCard
                title="Recent activity"
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
                      <TableHead>Time</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Role</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.data.map((row) => (
                      <TableRow key={row.id} className="hover:bg-muted/40">
                        <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                          {new Date(row.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell><ModuleStatusBadge status={row.action} /></TableCell>
                        <TableCell className="font-mono text-xs">{row.entity_type || '—'}</TableCell>
                        <TableCell className="max-w-md text-sm">{row.description || '—'}</TableCell>
                        <TableCell className="capitalize">{formatEnumLabel(row.actor_role) || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </PlacementTableCard>
            ) : null}
          </PlacementPageBody>
        </PlacementPageStack>
      )}
    </PlacementShell>
  )
}
