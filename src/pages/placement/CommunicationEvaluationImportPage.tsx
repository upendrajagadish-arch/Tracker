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
  confirmCommunicationUpload,
  previewCommunicationUpload,
  type CommunicationImportPreviewRow,
} from '@/api/placement/communicationEvaluations'
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

export function CommunicationEvaluationImportPage() {
  const { placementRole, user } = useAuth()
  const { base } = usePlacementPaths()
  const canManage = canManageReadiness(placementRole)

  const [preview, setPreview] = useState<Awaited<
    ReturnType<typeof previewCommunicationUpload>
  > | null>(null)
  const [loading, setLoading] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{
    created: number
    updated: number
    skipped: number
    failed: number
    warnings: Array<{ studentProfileId: string; message: string }>
  } | null>(null)

  if (!canManage) {
    return (
      <PlacementShell title="Import communication evaluations">
        <PlacementEmptyState
          title="Not allowed"
          description="Only Admin and TPO can bulk-upload communication evaluations."
          action={
            base ? (
              <Button asChild variant="outline" size="sm">
                <PlacementLink href={`${base}/communication`}>← Back</PlacementLink>
              </Button>
            ) : undefined
          }
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
      const data = await previewCommunicationUpload(records)
      setPreview(data)
    } catch (err) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Preview failed'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async () => {
    if (!preview?.matchedRows.length) return
    setConfirming(true)
    setError(null)
    try {
      const res = await confirmCommunicationUpload(
        preview.matchedRows as CommunicationImportPreviewRow[],
        {
          id: user?.id,
          name: user?.email ?? '',
          role: placementRole ?? '',
        },
      )
      setResult(res)
      setPreview(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setConfirming(false)
    }
  }

  return (
    <PlacementShell title="Import communication evaluations">
      <PlacementPageHeader
        title="Import communication evaluations"
        description="Match existing students by roll number. TOTAL and GRADE are calculated by the system (max 250) — mismatches are warned only."
        actions={
          base ? (
            <Button asChild variant="outline" size="sm">
              <PlacementLink href={`${base}/communication`}>← Back</PlacementLink>
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
            Required: Roll number + 25 score columns (0–10). Does not create new students.
          </p>
        </PlacementSectionCard>

        {loading ? <p className="text-sm text-muted-foreground">Parsing…</p> : null}

        {result ? (
          <PlacementSectionCard title="Import complete">
            <p className="text-sm">
              Created: {result.created} · Updated: {result.updated} · Skipped: {result.skipped} ·
              Failed: {result.failed}
            </p>
            {result.warnings.length > 0 ? (
              <p className="mt-2 text-xs text-amber-700">
                Readiness warnings: {result.warnings.length}
              </p>
            ) : null}
            {base ? (
              <Button asChild size="sm" className="mt-4">
                <PlacementLink href={`${base}/communication`}>View evaluations</PlacementLink>
              </Button>
            ) : null}
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

            {preview.duplicateRollNumbers.length > 0 ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Duplicate roll numbers: {preview.duplicateRollNumbers.join(', ')}
              </div>
            ) : null}

            <PlacementTableCard title="Matched rows">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Roll</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Total / 250</TableHead>
                    <TableHead>%</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Warnings</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.matchedRows.map((row) => (
                    <TableRow key={`${row.rowIndex}-${row.rollNumber}`}>
                      <TableCell className="font-mono text-xs">{row.rollNumber}</TableCell>
                      <TableCell>{row.studentName}</TableCell>
                      <TableCell>{row.totals?.total_score}/250</TableCell>
                      <TableCell>{row.totals?.percentage}%</TableCell>
                      <TableCell>{row.totals?.grade}</TableCell>
                      <TableCell>{row.status}</TableCell>
                      <TableCell className="text-amber-700">
                        {row.warnings.join('; ') || '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </PlacementTableCard>

            {(preview.unmatchedRows.length > 0 || preview.invalidRows.length > 0) && (
              <PlacementTableCard title="Unmatched / invalid">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Row</TableHead>
                      <TableHead>Roll</TableHead>
                      <TableHead>Issues</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...preview.unmatchedRows, ...preview.invalidRows].map((row) => (
                      <TableRow key={`bad-${row.rowIndex}`}>
                        <TableCell>{row.rowIndex}</TableCell>
                        <TableCell className="font-mono text-xs">{row.rollNumber || '—'}</TableCell>
                        <TableCell className="text-red-700">{row.issues.join('; ')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </PlacementTableCard>
            )}

            <Button
              type="button"
              disabled={!preview.matchedRows.length || confirming}
              onClick={() => void handleConfirm()}
            >
              {confirming
                ? 'Importing…'
                : `Confirm upload (${preview.matchedRows.length} rows)`}
            </Button>
          </>
        ) : null}
      </PlacementPageStack>
    </PlacementShell>
  )
}
