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
import { CommunicationModuleNav } from '@/components/placement/CommunicationModuleNav'
import { PlacementLink } from '@/components/placement/PlacementLink'
import { PlacementShell, usePlacementPaths } from '@/components/placement/PlacementShell'
import { PlacementPageHeader } from '@/components/placement/PlacementPageHeader'
import { PlacementEmptyState, PlacementStatCard } from '@/components/placement/PlacementStates'
import {
  LuxuryBarChart,
  LuxuryDonutChart,
} from '@/components/placement/charts'
import {
  PlacementAlerts,
  PlacementField,
  PlacementFilterCard,
  PlacementPageStack,
  PlacementTableCard,
} from '@/components/placement/PlacementUi'
import { tableSectionExport } from '@/lib/analyticsExports'
import {
  exportCommunicationEvaluations,
  listCommunicationEvaluations,
  type CommunicationEvaluationRow,
} from '@/api/placement/communicationEvaluations'
import { canEvaluateCommunication, canExportReports, canViewCommunicationModule } from '@/lib/placementNavigation'
import { useAuth } from '@/hooks/useAuth'
import { PassOutYearFilterBar, usePassOutYearFilter } from '@/lib/placementYearFilter'

export function CommunicationEvaluationsPage() {
  const { placementRole } = useAuth()
  const { base } = usePlacementPaths()
  const canManage = canEvaluateCommunication(placementRole)
  const canExport = canExportReports(placementRole)
  const canView = canViewCommunicationModule(placementRole)
  const { year, setYear, graduationYear } = usePassOutYearFilter()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<CommunicationEvaluationRow[]>([])
  const [summary, setSummary] = useState({
    totalEvaluated: 0,
    averageCommunicationScore: 0,
    gradeAPlus: 0,
    needsImprovement: 0,
  })
  const [filters, setFilters] = useState({
    branch: '',
    grade: '',
    search: '',
  })

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await listCommunicationEvaluations({
        ...filters,
        graduationYear,
        page: 1,
        limit: 50,
        latestOnly: true,
      })
      setRows(result.data)
      setSummary(result.summary)
    } catch (e) {
      const message =
        e && typeof e === 'object' && 'message' in e
          ? String((e as { message: unknown }).message)
          : 'Failed to load evaluations'
      const hint = /could not find the table|communication_evaluations|schema cache/i.test(message)
        ? ' Run scripts/apply-communication-evaluation-migration.sql in Supabase SQL Editor first.'
        : ''
      setError(`${message}${hint}`)
    } finally {
      setLoading(false)
    }
  }, [filters, graduationYear])

  useEffect(() => {
    void load()
  }, [load])

  const handleExport = async () => {
    try {
      const csv = await exportCommunicationEvaluations(filters)
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'communication-evaluations.csv'
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed')
    }
  }

  return (
    <PlacementShell title="Communication Students">
      <PlacementPageHeader
        title="Communication Students"
        description="25 criteria × 10 marks = 250 total. Communication Proficiency (80) · Presentation (60) · Behavioural (110)."
        actions={
          <>
            {canExport ? (
              <Button type="button" variant="outline" size="sm" onClick={() => void handleExport()}>
                Export
              </Button>
            ) : null}
            {canManage && base ? (
              <>
                <Button asChild variant="outline" size="sm">
                  <PlacementLink href={`${base}/communication/import`}>Bulk upload</PlacementLink>
                </Button>
                <Button asChild size="sm">
                  <PlacementLink href={`${base}/communication/new`}>New evaluation</PlacementLink>
                </Button>
              </>
            ) : null}
          </>
        }
      />

      <CommunicationModuleNav />

      {!canView ? (
        <PlacementEmptyState
          title="403 Forbidden"
          description="Only Admin, TPO, and Faculty can access Communication students."
        />
      ) : (
      <PlacementPageStack>
        <PlacementAlerts error={error} />
        <PassOutYearFilterBar value={year} onChange={setYear} />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <PlacementStatCard label="Total evaluated" value={summary.totalEvaluated} />
          <PlacementStatCard label="Average %" value={summary.averageCommunicationScore} />
          <PlacementStatCard label="A+ grades" value={summary.gradeAPlus} />
          <PlacementStatCard label="Needs improvement" value={summary.needsImprovement} />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <LuxuryDonutChart
            title="Grade quality"
            subtitle="A+ vs needs improvement among evaluated students"
            data={[
              { name: 'A+', value: summary.gradeAPlus, color: '#0ECB81' },
              { name: 'Needs improvement', value: summary.needsImprovement, color: '#F6465D' },
              {
                name: 'Other grades',
                value: Math.max(
                  0,
                  summary.totalEvaluated - summary.gradeAPlus - summary.needsImprovement,
                ),
                color: '#F0B90B',
              },
            ]}
            centerLabel="Evaluated"
            centerValue={summary.totalEvaluated}
          />
          <LuxuryBarChart
            title="Evaluation snapshot"
            subtitle="Core communication quality indicators"
            data={[
              { name: 'Evaluated', value: summary.totalEvaluated },
              { name: 'Average %', value: summary.averageCommunicationScore },
              { name: 'A+', value: summary.gradeAPlus },
              { name: 'Needs improvement', value: summary.needsImprovement },
            ]}
          />
        </div>

        <PlacementFilterCard
          actions={
            <Button type="button" size="sm" onClick={() => void load()}>
              Apply
            </Button>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <PlacementField label="Department / Branch">
              <input
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                value={filters.branch}
                onChange={(e) => setFilters((f) => ({ ...f, branch: e.target.value }))}
                placeholder="CSE"
              />
            </PlacementField>
            <PlacementField label="Grade">
              <input
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                value={filters.grade}
                onChange={(e) => setFilters((f) => ({ ...f, grade: e.target.value }))}
                placeholder="A+ / A / B+ / …"
              />
            </PlacementField>
            <PlacementField label="Search">
              <input
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                value={filters.search}
                onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                placeholder="Roll / name"
              />
            </PlacementField>
          </div>
        </PlacementFilterCard>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <PlacementEmptyState
            title="No evaluations yet"
            description="Create a manual evaluation or upload a spreadsheet of scores."
          />
        ) : (
          <PlacementTableCard
            title="Evaluations"
            exportSection={tableSectionExport(
              'Evaluations',
              [
                'Roll',
                'Name',
                'Dept',
                'Proficiency',
                'Presentation',
                'Behavioural',
                'Total / 250',
                '%',
                'Grade',
              ],
              [...rows]
                .sort((a, b) => {
                  const scoreDiff = Number(b.total_score || 0) - Number(a.total_score || 0)
                  if (scoreDiff !== 0) return scoreDiff
                  return String(a.roll_number).localeCompare(String(b.roll_number), undefined, {
                    numeric: true,
                  })
                })
                .map((row) => [
                  row.roll_number,
                  row.student_name,
                  row.department || '',
                  `${row.communication_proficiency_total}/80`,
                  `${row.presentation_skills_total}/60`,
                  `${row.behavioural_skills_total}/110`,
                  `${row.total_score}/250`,
                  `${row.percentage}%`,
                  row.grade,
                ]),
              { fileBase: 'communication_evaluations' },
            )}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Roll</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Dept</TableHead>
                  <TableHead>Proficiency</TableHead>
                  <TableHead>Presentation</TableHead>
                  <TableHead>Behavioural</TableHead>
                  <TableHead>Total / 250</TableHead>
                  <TableHead>%</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs">{row.roll_number}</TableCell>
                    <TableCell>{row.student_name}</TableCell>
                    <TableCell>{row.department || '—'}</TableCell>
                    <TableCell>{row.communication_proficiency_total}/80</TableCell>
                    <TableCell>{row.presentation_skills_total}/60</TableCell>
                    <TableCell>{row.behavioural_skills_total}/110</TableCell>
                    <TableCell className="font-semibold">{row.total_score}/250</TableCell>
                    <TableCell>{row.percentage}%</TableCell>
                    <TableCell>{row.grade}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {base ? (
                          <>
                            <PlacementLink
                              href={`${base}/students/$id`}
                              params={{ id: row.student_profile_id }}
                              className="text-xs text-primary hover:underline"
                            >
                              Profile
                            </PlacementLink>
                            <PlacementLink
                              href={`${base}/communication/$studentProfileId/edit`}
                              params={{ studentProfileId: row.student_profile_id }}
                              className="text-xs text-primary hover:underline"
                            >
                              {canManage ? 'Edit' : 'View'}
                            </PlacementLink>
                          </>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </PlacementTableCard>
        )}
      </PlacementPageStack>
      )}
    </PlacementShell>
  )
}
