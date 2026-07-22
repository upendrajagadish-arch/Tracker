import { useCallback, useEffect, useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
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
  PlacementTableCard,
  formatEnumLabel,
} from '@/components/placement/PlacementUi'
import { tableSectionExport } from '@/lib/analyticsExports'
import { listReadiness, recalculateReadiness } from '@/api/placement/readiness'
import { useAuth } from '@/hooks/useAuth'
import { StudentTypeahead } from '@/components/placement/StudentTypeahead'

export function ReadinessPage() {
  const { placementRole } = useAuth()
  const canRecalculate = placementRole === 'admin' || placementRole === 'tpo'
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [snapshots, setSnapshots] = useState<Awaited<ReturnType<typeof listReadiness>>['data']>([])
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [selectedStudentLabel, setSelectedStudentLabel] = useState('')
  const [recalculating, setRecalculating] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const readiness = await listReadiness({ limit: 30 })
      setSnapshots(readiness.data)
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

        {canRecalculate ? (
          <PlacementFilterCard title="Recalculate readiness">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <PlacementField label="Search student" hint="Type name or roll — matches appear automatically">
                <StudentTypeahead
                  selectedId={selectedStudentId}
                  selectedLabel={selectedStudentLabel}
                  disabled={Boolean(recalculating)}
                  onSelect={(student) => {
                    setSelectedStudentId(student.id)
                    setSelectedStudentLabel(`${student.full_name} · ${student.roll_number}`)
                  }}
                  onClear={() => {
                    setSelectedStudentId('')
                    setSelectedStudentLabel('')
                  }}
                />
              </PlacementField>
              <Button
                type="button"
                size="sm"
                disabled={!selectedStudentId || Boolean(recalculating)}
                onClick={() => {
                  if (selectedStudentId) void handleRecalculate(selectedStudentId)
                }}
              >
                {recalculating ? 'Recalculating…' : 'Recalculate'}
              </Button>
            </div>
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
            <PlacementTableCard
              title="Readiness history"
              count={snapshots.length}
              exportSection={tableSectionExport(
                'Readiness history',
                [
                  'Overall',
                  'Technical',
                  'Communication',
                  'Resume',
                  'Tech stack',
                  'Status',
                  'Risk',
                  'Calculated',
                ],
                [...snapshots]
                  .sort((a, b) => Number(b.overall_score || 0) - Number(a.overall_score || 0))
                  .map((row) => [
                    String(row.overall_score),
                    String(row.technical_score),
                    String(row.communication_score),
                    String(row.resume_score),
                    String(row.tech_stack_score),
                    String(row.readiness_status ?? ''),
                    formatEnumLabel(row.risk_level),
                    new Date(row.calculated_at).toLocaleString(),
                  ]),
                { fileBase: 'readiness_history' },
              )}
            >
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
