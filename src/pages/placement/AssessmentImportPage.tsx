import { useState } from 'react'
import * as XLSX from 'xlsx'
import { Button } from '@/components/ui/button'
import { PlacementLink } from '@/components/placement/PlacementLink'
import { PlacementShell, usePlacementPaths } from '@/components/placement/PlacementShell'
import { PlacementPageHeader } from '@/components/placement/PlacementPageHeader'
import { PlacementEmptyState, PlacementStatCard } from '@/components/placement/PlacementStates'
import {
  PlacementAlerts,
  PlacementField,
  PlacementPageStack,
  PlacementSectionCard,
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
  confirmAptitudeUpload,
  confirmVerbalUpload,
  previewAptitudeUpload,
  previewVerbalUpload,
  type AssessmentImportPreviewRow,
} from '@/api/placement/assessmentScores'
import { parseCsvText, sheetRowsToRecords } from '@/lib/studentImport'
import { canManageReadiness } from '@/lib/placementNavigation'
import { useAuth } from '@/hooks/useAuth'

async function parseUploadFile(file: File): Promise<Record<string, string>[]> {
  const lower = file.name.toLowerCase()
  if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' }) as unknown[][]
    return sheetRowsToRecords(rows)
  }
  return parseCsvText(await file.text())
}

function AssessmentImportPage({ kind }: { kind: 'aptitude' | 'verbal' }) {
  const { placementRole } = useAuth()
  const { base } = usePlacementPaths()
  const canManage = canManageReadiness(placementRole)
  const title = kind === 'aptitude' ? 'Import aptitude scores' : 'Import verbal scores'
  const scoreLabel = kind === 'aptitude' ? 'Aptitude Score' : 'Verbal Score'
  const backHref = kind === 'aptitude' ? `${base}/aptitude` : `${base}/verbal`

  const [preview, setPreview] = useState<{
    matchedRows: AssessmentImportPreviewRow[]
    unmatchedRows: AssessmentImportPreviewRow[]
    invalidRows: AssessmentImportPreviewRow[]
    summary: {
      total: number
      matched: number
      unmatched: number
      invalid: number
      willCreate: number
      willUpdate: number
    }
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{
    created: number
    updated: number
    skipped: number
    failed: number
  } | null>(null)

  if (!canManage) {
    return (
      <PlacementShell title={title}>
        <PlacementEmptyState
          title="Not allowed"
          description="Only Admin and TPO can bulk-upload aptitude and verbal scores."
        />
      </PlacementShell>
    )
  }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const records = await parseUploadFile(file)
      const data =
        kind === 'aptitude'
          ? await previewAptitudeUpload(records)
          : await previewVerbalUpload(records)
      setPreview(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Preview failed')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async () => {
    if (!preview?.matchedRows.length) return
    setConfirming(true)
    setError(null)
    try {
      const res =
        kind === 'aptitude'
          ? await confirmAptitudeUpload(preview.matchedRows)
          : await confirmVerbalUpload(preview.matchedRows)
      setResult(res)
      setPreview(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setConfirming(false)
    }
  }

  const allPreviewRows = preview
    ? [...preview.matchedRows, ...preview.unmatchedRows, ...preview.invalidRows]
    : []

  return (
    <PlacementShell title={title}>
      <PlacementPageHeader
        title={title}
        description={`Match existing students by roll number. Percentage and grade are calculated by the system. Columns: Roll number, Name, Dept, Email, ${scoreLabel}, Max Score, Test Name, Date.`}
        actions={
          base ? (
            <Button asChild variant="outline" size="sm">
              <PlacementLink href={backHref as '/admin/placement/aptitude'}>← Back</PlacementLink>
            </Button>
          ) : null
        }
      />

      <PlacementPageStack>
        <PlacementAlerts error={error} />

        <PlacementSectionCard title="Upload CSV / Excel">
          <PlacementField label="File">
            <input type="file" accept=".csv,.xlsx,.xls" onChange={(e) => void handleFile(e)} />
          </PlacementField>
          <p className="mt-2 text-xs text-muted-foreground">
            Does not create new students. Max score defaults to 100 when omitted.
          </p>
        </PlacementSectionCard>

        {loading ? <p className="text-sm text-muted-foreground">Parsing…</p> : null}

        {result ? (
          <PlacementSectionCard title="Import complete">
            <p className="text-sm">
              Created: {result.created} · Updated: {result.updated} · Skipped: {result.skipped} ·
              Failed: {result.failed}
            </p>
          </PlacementSectionCard>
        ) : null}

        {preview ? (
          <>
            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
              <PlacementStatCard label="Total" value={preview.summary.total} />
              <PlacementStatCard label="Matched" value={preview.summary.matched} />
              <PlacementStatCard label="Unmatched" value={preview.summary.unmatched} />
              <PlacementStatCard label="Invalid" value={preview.summary.invalid} />
              <PlacementStatCard label="Will create" value={preview.summary.willCreate} />
              <PlacementStatCard label="Will update" value={preview.summary.willUpdate} />
            </div>

            <PlacementTableCard title="Preview">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Roll</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>%</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allPreviewRows.map((row) => (
                    <TableRow key={`${row.rowIndex}-${row.rollNumber}`}>
                      <TableCell className="font-mono text-xs">{row.rollNumber || '—'}</TableCell>
                      <TableCell>{row.studentName || '—'}</TableCell>
                      <TableCell>
                        {row.score != null && row.maxScore != null
                          ? `${row.score}/${row.maxScore}`
                          : '—'}
                      </TableCell>
                      <TableCell>{row.percentage ?? '—'}</TableCell>
                      <TableCell>{row.grade ?? '—'}</TableCell>
                      <TableCell>{row.status}</TableCell>
                      <TableCell className="max-w-[220px] text-xs text-muted-foreground">
                        {[...row.issues, ...row.warnings].join('; ') || '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </PlacementTableCard>

            <Button
              type="button"
              disabled={!preview.matchedRows.length || confirming}
              onClick={() => void handleConfirm()}
            >
              {confirming ? 'Saving…' : `Confirm ${preview.matchedRows.length} matched rows`}
            </Button>
          </>
        ) : null}
      </PlacementPageStack>
    </PlacementShell>
  )
}

export function AptitudeImportPage() {
  return <AssessmentImportPage kind="aptitude" />
}

export function VerbalImportPage() {
  return <AssessmentImportPage kind="verbal" />
}
