import { useCallback, useEffect, useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PlacementShell } from '@/components/placement/PlacementShell'
import { PlacementPageHeader } from '@/components/placement/PlacementPageHeader'
import { ReadinessStatusBadge } from '@/components/placement/PlacementBadges'
import { PlacementEmptyState } from '@/components/placement/PlacementStates'
import {
  PlacementAlerts,
  PlacementField,
  PlacementFilterCard,
  PlacementPageBody,
  PlacementPageStack,
  PlacementSelect,
  PlacementTableCard,
  formatEnumLabel,
} from '@/components/placement/PlacementUi'
import { listReadiness, recalculateReadiness } from '@/api/placement/readiness'
import { listStudents } from '@/api/placement/students'
import { useAuth } from '@/hooks/useAuth'

export function ReadinessPage() {
  const { placementRole } = useAuth()
  const canRecalculate = placementRole === 'admin' || placementRole === 'tpo'
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [snapshots, setSnapshots] = useState<Awaited<ReturnType<typeof listReadiness>>['data']>([])
  const [students, setStudents] = useState<{ id: string; label: string }[]>([])
  const [recalculating, setRecalculating] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [readiness, studentPage] = await Promise.all([
        listReadiness({ limit: 30 }),
        listStudents({ limit: 100 }),
      ])
      setSnapshots(readiness.data)
      setStudents(studentPage.data.map((s) => ({ id: s.id, label: `${s.roll_number} — ${s.full_name}` })))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load readiness data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const handleRecalculate = async (studentId: string) => {
    setRecalculating(studentId)
    setError(null)
    try {
      await recalculateReadiness(studentId)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Recalculation failed')
    } finally {
      setRecalculating(null)
    }
  }

  return (
    <PlacementShell title="Readiness">
      <PlacementPageHeader
        title="Placement Readiness"
        description="View readiness snapshots and recalculate student placement scores."
      />

      <PlacementPageStack>
        <PlacementAlerts error={error} />

        {canRecalculate && students.length ? (
          <PlacementFilterCard title="Recalculate readiness">
            <PlacementField label="Select student" hint="Choose a student to generate a fresh readiness snapshot">
              <PlacementSelect
                value=""
                disabled={Boolean(recalculating)}
                onChange={(value) => { if (value) void handleRecalculate(value) }}
              >
                <option value="">Select student…</option>
                {students.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </PlacementSelect>
            </PlacementField>
            {recalculating ? <p className="mt-2 font-mono text-xs text-muted-foreground">Recalculating readiness…</p> : null}
          </PlacementFilterCard>
        ) : null}

        <PlacementPageBody
          loading={loading}
          loadingLabel="Loading readiness snapshots…"
          empty={!snapshots.length ? (
            <PlacementEmptyState
              title="No readiness snapshots"
              description="Recalculate readiness for a student to create the first snapshot."
            />
          ) : undefined}
        >
          {snapshots.length ? (
            <PlacementTableCard title="Readiness history" count={snapshots.length}>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/40">
                    <TableHead>Overall</TableHead>
                    <TableHead>Technical</TableHead>
                    <TableHead>Communication</TableHead>
                    <TableHead>Resume</TableHead>
                    <TableHead>Tech stack</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Risk</TableHead>
                    <TableHead>Calculated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {snapshots.map((row) => (
                    <TableRow key={row.id} className="hover:bg-muted/40">
                      <TableCell className="font-medium">{row.overall_score}</TableCell>
                      <TableCell>{row.technical_score}</TableCell>
                      <TableCell>{row.communication_score}</TableCell>
                      <TableCell>{row.resume_score}</TableCell>
                      <TableCell>{row.tech_stack_score}</TableCell>
                      <TableCell><ReadinessStatusBadge status={row.readiness_status} /></TableCell>
                      <TableCell>{formatEnumLabel(row.risk_level)}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {new Date(row.calculated_at).toLocaleString()}
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
