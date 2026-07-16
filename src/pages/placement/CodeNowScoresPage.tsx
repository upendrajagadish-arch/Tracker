import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { PlacementLink } from '@/components/placement/PlacementLink'
import { PlacementShell, usePlacementPaths } from '@/components/placement/PlacementShell'
import { PlacementPageHeader } from '@/components/placement/PlacementPageHeader'
import {
  PlacementEmptyState,
  PlacementLoadingBlock,
  PlacementStatCard,
} from '@/components/placement/PlacementStates'
import {
  LuxuryBarChart,
  LuxuryDonutChart,
} from '@/components/placement/charts'
import {
  PlacementAlerts,
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
import {
  exportCodeNowScores,
  listCodeNowProfiles,
} from '@/api/placement/codeNow'
import { canExportReports, canManageReadiness } from '@/lib/placementNavigation'
import { useAuth } from '@/hooks/useAuth'
import { CODENOW_CATEGORY_LABELS, type CodeNowCategory } from '@/lib/codeNowCategories'
import { isCodeNowEnabled } from '@/lib/codeNowConfig'

export function CodeNowScoresPage() {
  const { placementRole } = useAuth()
  const { base } = usePlacementPaths()
  const canManage = canManageReadiness(placementRole)
  const canExport = canExportReports(placementRole) || canManage

  const [rows, setRows] = useState<
    Awaited<ReturnType<typeof listCodeNowProfiles>>['data']
  >([])
  const [summary, setSummary] = useState<
    Awaited<ReturnType<typeof listCodeNowProfiles>>['summary'] | null
  >(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const result = await listCodeNowProfiles({ limit: 100 })
        setRows(result.data)
        setSummary(result.summary)
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Failed to load CodeNow scores'
        if (/codenow_profiles|schema cache|Could not find/i.test(message)) {
          setError(
            `${message} Run scripts/apply-codenow-scores-migration.sql in Supabase SQL Editor.`,
          )
        } else {
          setError(message)
        }
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const handleExport = async () => {
    try {
      const csv = await exportCodeNowScores()
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = 'codenow-scores.csv'
      a.click()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed')
    }
  }

  return (
    <PlacementShell title="CodeNow scores">
      <PlacementPageHeader
        title="CodeNow scores"
        description={
          isCodeNowEnabled()
            ? 'CodeNow API is enabled. Profiles can sync from API or CSV/XLSX import.'
            : 'CodeNow API is not configured (CODENOW_NOT_CONFIGURED). Use CSV/XLSX import.'
        }
        actions={
          <div className="flex flex-wrap gap-2">
            {canExport ? (
              <Button type="button" size="sm" variant="outline" onClick={() => void handleExport()}>
                Export CSV
              </Button>
            ) : null}
            {canManage && base ? (
              <Button asChild size="sm">
                <PlacementLink href={`${base}/codenow/import` as '/admin/placement/codenow/import'}>
                  Bulk upload
                </PlacementLink>
              </Button>
            ) : null}
          </div>
        }
      />

      <PlacementPageStack>
        <PlacementAlerts error={error} />
        {summary ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <PlacementStatCard label="CodeNow profiles" value={summary.totalProfiles} />
              <PlacementStatCard label="Average %" value={summary.averageScore} />
              <PlacementStatCard label="Attempted challenges" value={summary.attemptedChallenges} />
              <PlacementStatCard
                label="Top category"
                value={
                  summary.topCategory
                    ? CODENOW_CATEGORY_LABELS[summary.topCategory as CodeNowCategory] ||
                      summary.topCategory
                    : '—'
                }
              />
              <PlacementStatCard label="Without CodeNow" value={summary.studentsWithoutCodeNow} />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <LuxuryDonutChart
                title="Coverage"
                subtitle="Students with vs without CodeNow profiles"
                data={[
                  { name: 'With CodeNow', value: summary.totalProfiles, color: '#0ECB81' },
                  { name: 'Without CodeNow', value: summary.studentsWithoutCodeNow, color: '#F6465D' },
                ]}
                centerLabel="Profiles"
                centerValue={summary.totalProfiles}
              />
              <LuxuryBarChart
                title="Category attempts"
                subtitle="Challenge attempts by CodeNow category"
                data={(summary.categoryDistribution ?? []).map((row) => ({
                  name:
                    CODENOW_CATEGORY_LABELS[row.category as CodeNowCategory] || row.category,
                  value: row.count,
                }))}
                layout="horizontal"
                height={320}
              />
            </div>
          </>
        ) : null}

        {summary?.categoryDistribution?.length ? (
          <PlacementTableCard title="Category distribution">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead>Avg %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.categoryDistribution.map((row) => (
                  <TableRow key={row.category}>
                    <TableCell>
                      {CODENOW_CATEGORY_LABELS[row.category as CodeNowCategory] || row.category}
                    </TableCell>
                    <TableCell>{row.count}</TableCell>
                    <TableCell>{row.averagePercentage}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </PlacementTableCard>
        ) : null}

        {loading ? <PlacementLoadingBlock label="Loading CodeNow scores…" /> : null}
        {!loading && !rows.length && !error ? (
          <PlacementEmptyState
            title="No CodeNow scores yet"
            description={
              canManage
                ? 'Upload a CSV/Excel file matched by roll number.'
                : 'No CodeNow scores recorded.'
            }
            action={
              canManage && base ? (
                <Button asChild size="sm">
                  <PlacementLink href={`${base}/codenow/import` as '/admin/placement/codenow/import'}>
                    Bulk upload
                  </PlacementLink>
                </Button>
              ) : undefined
            }
          />
        ) : null}

        {rows.length ? (
          <PlacementTableCard title="Student CodeNow profiles">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Roll</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Dept</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>%</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Challenges</TableHead>
                  <TableHead>Synced</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs">{row.roll_number}</TableCell>
                    <TableCell>{row.studentName || '—'}</TableCell>
                    <TableCell>{row.department || '—'}</TableCell>
                    <TableCell>{row.codenow_username || '—'}</TableCell>
                    <TableCell>
                      {row.total_score}/{row.max_score}
                    </TableCell>
                    <TableCell>{row.percentage}%</TableCell>
                    <TableCell>{row.grade}</TableCell>
                    <TableCell>
                      {row.solved_challenges}/{row.total_challenges}
                    </TableCell>
                    <TableCell>{new Date(row.last_synced_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {base ? (
                        <Button asChild size="sm" variant="outline">
                          <PlacementLink
                            href={`${base}/students/$id` as '/admin/placement/students/$id'}
                            params={{ id: row.student_profile_id }}
                          >
                            View
                          </PlacementLink>
                        </Button>
                      ) : (
                        '—'
                      )}
                    </TableCell>
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
