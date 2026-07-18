import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { PlacementLink } from '@/components/placement/PlacementLink'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { PlacementShell, usePlacementPaths } from '@/components/placement/PlacementShell'
import { PlacementPageHeader } from '@/components/placement/PlacementPageHeader'
import { PlacementEmptyState, PlacementErrorAlert, PlacementLoadingBlock } from '@/components/placement/PlacementStates'
import { getRequirement } from '@/api/placement/companies'
import { listMatches, runMatching } from '@/api/placement/matching'
import { listStudents } from '@/api/placement/students'
import { canRunMatching } from '@/lib/placementNavigation'
import { useParams } from '@tanstack/react-router'

export function RequirementDetailPage() {
  const { id } = useParams({ strict: false }) as { id: string }
  const { base, role } = usePlacementPaths()
  const canMatch = canRunMatching(role)
  const [requirement, setRequirement] = useState<Awaited<ReturnType<typeof getRequirement>>>(null)
  const [matches, setMatches] = useState<Awaited<ReturnType<typeof listMatches>>>([])
  const [studentNames, setStudentNames] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [req, matchRows, students] = await Promise.all([
        getRequirement(id),
        listMatches(id),
        listStudents({ limit: 500 }),
      ])
      if (!req) setError('Requirement not found')
      setRequirement(req)
      setMatches(matchRows)
      const names: Record<string, string> = {}
      students.data.forEach((s) => { names[s.id] = `${s.roll_number} — ${s.full_name}` })
      setStudentNames(names)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load requirement')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  const handleRunMatching = async () => {
    setRunning(true)
    setError(null)
    try {
      await runMatching(id)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Matching failed')
    } finally {
      setRunning(false)
    }
  }

  return (
    <PlacementShell title="Requirement Detail">
      <PlacementPageHeader
        title={requirement?.role_title ?? 'Requirement'}
        description={requirement ? `Status: ${requirement.status}` : undefined}
        actions={
          <div className="flex gap-2">
            {base ? (
              <Button asChild variant="outline" size="sm">
                <PlacementLink href={`${base}/requirements`}>← Requirements</PlacementLink>
              </Button>
            ) : null}
            {canMatch ? (
              <Button size="sm" disabled={running} onClick={() => void handleRunMatching()}>
                {running ? 'Running…' : 'Run matching'}
              </Button>
            ) : null}
          </div>
        }
      />

      {error ? <div className="mb-4"><PlacementErrorAlert message={error} /></div> : null}
      {loading ? <PlacementLoadingBlock /> : null}

      {!loading && requirement ? (
        <div className="space-y-6">
          <Card className="term-window border-border bg-card/80">
            <CardHeader className="border-b border-border">
              <CardTitle className="text-base">Eligibility criteria</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 pt-4 text-sm text-muted-foreground sm:grid-cols-2">
              <p>Branches: {requirement.eligible_branches?.join(', ') || 'Any'}</p>
              <p>Batches: {requirement.eligible_batches?.join(', ') || 'Any'}</p>
              <p>Min CGPA: {requirement.min_cgpa ?? '—'}</p>
              <p>Min readiness: {requirement.min_readiness_score ?? '—'}</p>
              <p className="sm:col-span-2">Required: {requirement.required_skills?.join(', ') || '—'}</p>
              <p className="sm:col-span-2">Preferred: {requirement.preferred_skills?.join(', ') || '—'}</p>
            </CardContent>
          </Card>

          <Card className="overflow-hidden term-window border-border bg-card/80">
            <CardHeader className="border-b border-border">
              <CardTitle className="text-base">Match results ({matches.length})</CardTitle>
            </CardHeader>
            {!matches.length ? (
              <CardContent className="pt-4">
                <PlacementEmptyState title="No matches yet" description="Run matching to score students against this requirement." />
              </CardContent>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/40">
                      <TableHead>Student</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Eligibility</TableHead>
                      <TableHead>Missing skills</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {matches.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell>{studentNames[m.student_profile_id] ?? m.student_profile_id.slice(0, 8)}</TableCell>
                        <TableCell className="font-medium">{m.match_score}</TableCell>
                        <TableCell><Badge variant="outline">{m.match_status}</Badge></TableCell>
                        <TableCell>{m.eligibility_status}</TableCell>
                        <TableCell className="max-w-xs truncate">{m.missing_required_skills?.join(', ') || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </div>
      ) : null}
    </PlacementShell>
  )
}
