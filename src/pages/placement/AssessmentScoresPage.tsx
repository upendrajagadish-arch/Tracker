import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { PlacementLink } from '@/components/placement/PlacementLink'
import { PlacementShell, usePlacementPaths } from '@/components/placement/PlacementShell'
import { PlacementPageHeader } from '@/components/placement/PlacementPageHeader'
import { PlacementEmptyState, PlacementLoadingBlock } from '@/components/placement/PlacementStates'
import {
  PlacementAlerts,
  PlacementPageStack,
  PlacementTableCard,
} from '@/components/placement/PlacementUi'
import { tableSectionExport } from '@/lib/analyticsExports'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  listAptitudeScores,
  listVerbalScores,
  type AptitudeScoreRow,
  type VerbalScoreRow,
} from '@/api/placement/assessmentScores'
import { canManageReadiness } from '@/lib/placementNavigation'
import { useAuth } from '@/hooks/useAuth'

export function AptitudeScoresPage() {
  return <AssessmentScoresPage kind="aptitude" />
}

export function VerbalScoresPage() {
  return <AssessmentScoresPage kind="verbal" />
}

function AssessmentScoresPage({ kind }: { kind: 'aptitude' | 'verbal' }) {
  const { placementRole } = useAuth()
  const { base } = usePlacementPaths()
  const canManage = canManageReadiness(placementRole)
  const title = kind === 'aptitude' ? 'Aptitude scores' : 'Verbal scores'
  const importHref =
    kind === 'aptitude' ? `${base}/aptitude/import` : `${base}/verbal/import`

  const [rows, setRows] = useState<Array<AptitudeScoreRow | VerbalScoreRow>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const data =
          kind === 'aptitude' ? await listAptitudeScores() : await listVerbalScores()
        setRows(data)
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Failed to load scores'
        if (/aptitude_scores|verbal_scores|schema cache|Could not find/i.test(message)) {
          setError(
            `${message} Run scripts/apply-aptitude-verbal-enhanced-share-migration.sql in Supabase SQL Editor.`,
          )
        } else {
          setError(message)
        }
      } finally {
        setLoading(false)
      }
    })()
  }, [kind])

  return (
    <PlacementShell title={title}>
      <PlacementPageHeader
        title={title}
        description="Match by roll number. Percentage and grade are system-calculated."
        actions={
          canManage && base ? (
            <Button asChild size="sm">
              <PlacementLink href={importHref as '/admin/placement/aptitude/import'}>
                Bulk upload
              </PlacementLink>
            </Button>
          ) : null
        }
      />

      <PlacementPageStack>
        <PlacementAlerts error={error} />
        {loading ? <PlacementLoadingBlock label={`Loading ${kind} scores…`} /> : null}
        {!loading && !rows.length && !error ? (
          <PlacementEmptyState
            title={`No ${kind} scores yet`}
            description={canManage ? 'Upload a CSV/Excel file to get started.' : 'No scores recorded.'}
            action={
              canManage && base ? (
                <Button asChild size="sm">
                  <PlacementLink href={importHref as '/admin/placement/aptitude/import'}>
                    Bulk upload
                  </PlacementLink>
                </Button>
              ) : undefined
            }
          />
        ) : null}
        {rows.length ? (
          <PlacementTableCard
            title="Latest scores"
            exportSection={tableSectionExport(
              'Latest scores',
              ['Roll', 'Score', '%', 'Grade', 'Test', 'Date'],
              [...rows]
                .sort((a, b) => {
                  const scoreDiff = Number(b.percentage || 0) - Number(a.percentage || 0)
                  if (scoreDiff !== 0) return scoreDiff
                  return String(a.roll_number).localeCompare(String(b.roll_number), undefined, {
                    numeric: true,
                  })
                })
                .map((row) => [
                  row.roll_number,
                  `${row.score}/${row.max_score}`,
                  `${row.percentage}%`,
                  row.grade,
                  row.test_name || '',
                  new Date(row.evaluated_at).toLocaleDateString(),
                ]),
              { fileBase: kind === 'aptitude' ? 'aptitude_scores' : 'verbal_scores' },
            )}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Roll</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>%</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Test</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs">{row.roll_number}</TableCell>
                    <TableCell>
                      {row.score}/{row.max_score}
                    </TableCell>
                    <TableCell>{row.percentage}%</TableCell>
                    <TableCell>{row.grade}</TableCell>
                    <TableCell>{row.test_name || '—'}</TableCell>
                    <TableCell>{new Date(row.evaluated_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </PlacementTableCard>
        ) : null}
      </PlacementPageStack>
    </PlacementShell>
  )
}
