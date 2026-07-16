import { useCallback, useEffect, useMemo, useState } from 'react'
import { PlacementLink } from '@/components/placement/PlacementLink'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PlacementShell, usePlacementPaths } from '@/components/placement/PlacementShell'
import { PlacementPageHeader } from '@/components/placement/PlacementPageHeader'
import { PlacementEmptyState } from '@/components/placement/PlacementStates'
import {
  PlacementAlerts,
  PlacementField,
  PlacementFilterCard,
  PlacementPageBody,
  PlacementPageStack,
  PlacementTableCard,
} from '@/components/placement/PlacementUi'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { bulkAssignStudents, listStudentsNeedingAssignment } from '@/api/placement/students'

type DraftAssignment = {
  branch: string
  batch: string
}

export function StudentBulkAssignPage() {
  const { base } = usePlacementPaths()
  const [students, setStudents] = useState<Awaited<ReturnType<typeof listStudentsNeedingAssignment>>>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [drafts, setDrafts] = useState<Record<string, DraftAssignment>>({})
  const [bulkBranch, setBulkBranch] = useState('')
  const [bulkBatch, setBulkBatch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const rows = await listStudentsNeedingAssignment()
      setStudents(rows)
      setDrafts((current) => {
        const next = { ...current }
        rows.forEach((student) => {
          if (!next[student.id]) {
            next[student.id] = {
              branch: student.branch || '',
              batch: student.batch || '',
            }
          }
        })
        return next
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load students')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const allSelected = useMemo(
    () => students.length > 0 && selected.size === students.length,
    [students.length, selected.size],
  )

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set())
      return
    }
    setSelected(new Set(students.map((student) => student.id)))
  }

  const applyBulkValues = () => {
    if (!bulkBranch.trim() && !bulkBatch.trim()) return
    setDrafts((current) => {
      const next = { ...current }
      students.forEach((student) => {
        if (!selected.has(student.id)) return
        next[student.id] = {
          branch: bulkBranch.trim() || next[student.id]?.branch || '',
          batch: bulkBatch.trim() || next[student.id]?.batch || '',
        }
      })
      return next
    })
  }

  const handleSave = async () => {
    const assignments = students
      .filter((student) => selected.has(student.id))
      .map((student) => ({
        studentId: student.id,
        branch: drafts[student.id]?.branch ?? '',
        batch: drafts[student.id]?.batch ?? '',
      }))

    if (!assignments.length) {
      setError('Select at least one student to assign branch and year.')
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const result = await bulkAssignStudents(assignments)
      if (result.errors.length) {
        setError(result.errors.join(' '))
      }
      if (result.updated) {
        setSuccess(`Updated branch and year for ${result.updated} student(s).`)
        setSelected(new Set())
        await load()
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Assignment failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <PlacementShell title="Assign branch & year">
      <PlacementPageHeader
        title="Assign branch & year"
        description="Faculty can assign branch and graduation year for bulk-added students. Updates reflect across the placement application."
        actions={
          base ? (
            <Button asChild variant="outline" size="sm">
              <PlacementLink href={`${base}/students`}>Back to tracker</PlacementLink>
            </Button>
          ) : null
        }
      />

      <PlacementPageStack>
        <PlacementAlerts error={error} success={success} />

        <PlacementFilterCard title="Bulk assignment">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <PlacementField label="Branch for selected">
              <Input placeholder="e.g. CSE" value={bulkBranch} onChange={(e) => setBulkBranch(e.target.value)} className="border-border bg-card" />
            </PlacementField>
            <PlacementField label="Academic Batch for selected">
              <Input placeholder="e.g. 2026" value={bulkBatch} onChange={(e) => setBulkBatch(e.target.value)} className="border-border bg-card" />
            </PlacementField>
            <div className="flex items-end gap-2 sm:col-span-2">
              <Button type="button" size="sm" variant="outline" onClick={applyBulkValues}>
                Apply to selected
              </Button>
              <Button type="button" size="sm" disabled={saving || !selected.size} onClick={() => void handleSave()}>
                {saving ? 'Saving…' : `Save ${selected.size || ''} assignments`}
              </Button>
            </div>
          </div>
        </PlacementFilterCard>

        <PlacementPageBody
          loading={loading}
          loadingLabel="Loading students needing assignment…"
          empty={!students.length ? (
            <PlacementEmptyState
              title="All students have branch and year"
              description="New quick-add imports will appear here until branch and year are assigned."
            />
          ) : undefined}
        >
          {students.length ? (
            <PlacementTableCard title="Students needing assignment" count={students.length}>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/40">
                    <TableHead>
                      <input type="checkbox" checked={allSelected} onChange={toggleAll} />
                    </TableHead>
                    <TableHead>Roll</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Year</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => (
                    <TableRow key={student.id} className="hover:bg-muted/40">
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selected.has(student.id)}
                          onChange={(e) => {
                            setSelected((current) => {
                              const next = new Set(current)
                              if (e.target.checked) next.add(student.id)
                              else next.delete(student.id)
                              return next
                            })
                          }}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-xs">{student.roll_number}</TableCell>
                      <TableCell className="font-medium">{student.full_name}</TableCell>
                      <TableCell>{student.email || '—'}</TableCell>
                      <TableCell>
                        <Input
                          value={drafts[student.id]?.branch ?? ''}
                          onChange={(e) => setDrafts((current) => ({
                            ...current,
                            [student.id]: { ...current[student.id], branch: e.target.value, batch: current[student.id]?.batch ?? '' },
                          }))}
                          placeholder="Branch"
                          className="h-8 border-border bg-card"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={drafts[student.id]?.batch ?? ''}
                          onChange={(e) => setDrafts((current) => ({
                            ...current,
                            [student.id]: { branch: current[student.id]?.branch ?? '', batch: e.target.value },
                          }))}
                          placeholder="Year"
                          className="h-8 border-border bg-card"
                        />
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
