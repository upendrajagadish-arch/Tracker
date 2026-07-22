import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PlacementLink } from '@/components/placement/PlacementLink'
import { PlacementShell, usePlacementPaths } from '@/components/placement/PlacementShell'
import { PlacementPageHeader } from '@/components/placement/PlacementPageHeader'
import { TechStackModuleNav } from '@/components/placement/TechStackModuleNav'
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
import { listTechStackStudents, type TechStackStudentRow } from '@/api/placement/techSkills'
import { classifyTechStackBadgeFromSkills, formatTechStackBadge } from '@/lib/techStackBadge'
import { canViewTechStack } from '@/lib/placementPermissions'
import { useAuth } from '@/hooks/useAuth'
import { usePassOutYearFilter } from '@/lib/placementYearFilter'

export function TechStackStudentsPage() {
  const { placementRole } = useAuth()
  const { base } = usePlacementPaths()
  const canView = canViewTechStack(placementRole)
  const { year, setYear, graduationYear } = usePassOutYearFilter()
  const [rows, setRows] = useState<TechStackStudentRow[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!canView) return
    setLoading(true)
    setError(null)
    try {
      const data = await listTechStackStudents({
        graduationYear,
        q: search.trim() || undefined,
      })
      setRows(data.filter((row) => row.skillsCount > 0))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load students')
    } finally {
      setLoading(false)
    }
  }, [canView, graduationYear, search])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <PlacementShell title="Tech Stack Students">
      <PlacementPageHeader
        title="Tech Stack Students"
        description="Students with coding-language evaluations for the selected pass-out year."
        actions={
          base ? (
            <Button asChild size="sm" variant="outline">
              <PlacementLink href={`${base}/tech-stack/evaluate`}>Evaluate</PlacementLink>
            </Button>
          ) : null
        }
      />
      <TechStackModuleNav />

      {!canView ? (
        <PlacementEmptyState title="No access" description="Tech stack students are available to Admin, TPO, and Faculty." />
      ) : (
        <PlacementPageStack>
          <PlacementAlerts error={error} />
          <PlacementFilterCard
            actions={
              <Button type="button" size="sm" onClick={() => void load()}>
                Apply
              </Button>
            }
          >
            <PlacementField label="Search">
              <Input
                className="border-border bg-card"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Roll / name"
              />
            </PlacementField>
          </PlacementFilterCard>

          <PlacementPageBody
            loading={loading}
            loadingLabel="Loading students…"
            empty={
              !rows.length ? (
                <PlacementEmptyState
                  title="No evaluated students"
                  description="Use Evaluate or Bulk Upload to assign coding languages for this year."
                />
              ) : undefined
            }
          >
            {rows.length ? (
              <PlacementTableCard title="Students" count={rows.length}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Roll</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Branch</TableHead>
                      <TableHead>Skills</TableHead>
                      <TableHead>Interviewers</TableHead>
                      <TableHead>Badge</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => {
                      const interviewers = [
                        ...new Set(
                          row.skills
                            .map((skill) => skill.assessed_by_name?.trim())
                            .filter(Boolean) as string[],
                        ),
                      ]
                      return (
                        <TableRow key={row.student.id}>
                          <TableCell className="font-mono text-xs">{row.student.roll_number}</TableCell>
                          <TableCell className="font-medium">{row.student.full_name}</TableCell>
                          <TableCell>{row.student.branch || '—'}</TableCell>
                          <TableCell className="max-w-xs text-xs text-muted-foreground">
                            {row.topSkills.join(', ') || '—'}
                            {row.skillsCount > row.topSkills.length ? ` +${row.skillsCount - row.topSkills.length}` : ''}
                          </TableCell>
                          <TableCell className="max-w-[12rem] text-xs text-muted-foreground">
                            {interviewers.length ? interviewers.join(', ') : '—'}
                          </TableCell>
                          <TableCell>{formatTechStackBadge(classifyTechStackBadgeFromSkills(row.skills))}</TableCell>
                          <TableCell>
                            {base ? (
                              <Button asChild size="sm" variant="outline">
                                <PlacementLink href={`${base}/students/${row.student.id}`}>
                                  Profile
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
      )}
    </PlacementShell>
  )
}
