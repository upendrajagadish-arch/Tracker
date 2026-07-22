import { useMemo, useState } from 'react'
import { PlacementLink } from '@/components/placement/PlacementLink'
import { Button } from '@/components/ui/button'
import { PlacementShell, usePlacementPaths } from '@/components/placement/PlacementShell'
import { PlacementPageHeader } from '@/components/placement/PlacementPageHeader'
import { PlacementEmptyState } from '@/components/placement/PlacementStates'
import {
  PlacementAlerts,
  PlacementField,
  PlacementFilterCard,
  PlacementPageStack,
  PlacementSectionCard,
  PlacementSelect,
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
  importValidatedStudents,
  previewStudentsImport,
  type CsvImportResult,
  type ImportPreviewResult,
  type StudentImportMode,
} from '@/api/placement/students'
import {
  IMPORT_TEMPLATE_FULL,
  IMPORT_TEMPLATE_QUICK,
  parseCsvText,
  sheetRowsToRecords,
} from '@/lib/studentImport'
import { readSpreadsheetRows } from '@/lib/spreadsheet'
import { canImportStudents } from '@/lib/placementNavigation'

async function parseUploadFile(file: File): Promise<Record<string, string>[]> {
  const lower = file.name.toLowerCase()
  if (lower.endsWith('.xls')) throw new Error('Legacy .xls files are not supported. Save the file as .xlsx or .csv.')
  if (lower.endsWith('.xlsx')) {
    const buffer = await file.arrayBuffer()
    return sheetRowsToRecords(await readSpreadsheetRows(buffer))
  }
  return parseCsvText(await file.text())
}

export function StudentImportPage() {
  const { base, role } = usePlacementPaths()
  const canImport = canImportStudents(role)
  const [mode, setMode] = useState<StudentImportMode>('full')
  const [fileName, setFileName] = useState<string | null>(null)
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<CsvImportResult | null>(null)

  const validRows = useMemo(
    () => preview?.rows.filter((row) => row.input && !row.errors.length) ?? [],
    [preview],
  )

  const handleFile = async (file: File | null) => {
    if (!file) return
    setLoading(true)
    setError(null)
    setResult(null)
    setFileName(file.name)
    try {
      const records = await parseUploadFile(file)
      if (!records.length) {
        setError('No student rows found. Check headers and data rows.')
        setPreview(null)
        return
      }
      setPreview(await previewStudentsImport(records, mode))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to read file')
      setPreview(null)
    } finally {
      setLoading(false)
    }
  }

  const handleRevalidate = async () => {
    if (!preview) return
    setLoading(true)
    setError(null)
    try {
      const records = preview.rows.map((row) => row.raw)
      setPreview(await previewStudentsImport(records, mode))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Validation failed')
    } finally {
      setLoading(false)
    }
  }

  const handleImport = async () => {
    if (!validRows.length) {
      setError('Fix validation errors before importing.')
      return
    }
    setImporting(true)
    setError(null)
    try {
      const res = await importValidatedStudents(validRows.map((row) => row.input!))
      setResult(res)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  if (!canImport) {
    return (
      <PlacementShell title="Import students">
        <PlacementEmptyState
          title="Not allowed"
          description="Only administrators, placement officers, and faculty can import students."
        />
      </PlacementShell>
    )
  }

  return (
    <PlacementShell title="Bulk add students">
      <PlacementPageHeader
        title="Bulk add students"
        description="Upload Excel or CSV, cross-check student records, then import. Faculty can assign branch and year later for quick-add rows."
        actions={
          base ? (
            <Button asChild variant="outline" size="sm">
              <PlacementLink href={`${base}/students`}>Back to tracker</PlacementLink>
            </Button>
          ) : null
        }
      />

      <PlacementPageStack>
        <PlacementAlerts error={error} />

        <PlacementFilterCard title="Import mode">
          <div className="grid gap-4 sm:grid-cols-2">
            <PlacementField label="Import type" hint="Full import validates all required fields. Quick add lets faculty assign branch/year later.">
              <PlacementSelect
                value={mode}
                onChange={(value) => {
                  setMode(value as StudentImportMode)
                  setPreview(null)
                  setResult(null)
                }}
              >
                <option value="full">Full import (email, roll, branch, year, DOB, mobile)</option>
                <option value="quick">Quick bulk add (roll, name, email)</option>
              </PlacementSelect>
            </PlacementField>
            <PlacementField label="Upload file" hint="Supports .xlsx and .csv">
              <input
                type="file"
                accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:border-border file:bg-muted/30 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-muted-foreground"
              />
              {fileName ? <p className="mt-1 font-mono text-xs text-muted-foreground">Selected: {fileName}</p> : null}
            </PlacementField>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => void navigator.clipboard.writeText(mode === 'full' ? IMPORT_TEMPLATE_FULL : IMPORT_TEMPLATE_QUICK)}>
              Copy template
            </Button>
            {preview ? (
              <Button type="button" size="sm" variant="outline" disabled={loading} onClick={() => void handleRevalidate()}>
                Re-check rows
              </Button>
            ) : null}
            <Button type="button" size="sm" disabled={importing || !validRows.length} onClick={() => void handleImport()}>
              {importing ? 'Importing…' : `Import ${validRows.length} students`}
            </Button>
          </div>
        </PlacementFilterCard>

        {loading ? (
          <PlacementEmptyState title="Validating file…" description="Cross-checking email, roll number, branch, year, date of birth, and mobile number." />
        ) : null}

        {!loading && preview ? (
          <PlacementTableCard
            title="Cross-check preview"
            count={`${preview.validCount} valid · ${preview.errorCount} issues`}
          >
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/40">
                  <TableHead>Row</TableHead>
                  <TableHead>Roll</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>DOB</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.rows.map((row) => (
                  <TableRow key={row.rowNumber} className="hover:bg-muted/40">
                    <TableCell>{row.rowNumber}</TableCell>
                    <TableCell>{row.raw.roll_number || '—'}</TableCell>
                    <TableCell>{row.raw.full_name || '—'}</TableCell>
                    <TableCell>{row.raw.email || '—'}</TableCell>
                    <TableCell>{row.raw.branch || '—'}</TableCell>
                    <TableCell>{row.raw.batch || row.raw.year || '—'}</TableCell>
                    <TableCell>{row.raw.phone || row.raw.mobile || '—'}</TableCell>
                    <TableCell>{row.raw.date_of_birth || row.raw.dob || '—'}</TableCell>
                    <TableCell className="max-w-xs text-xs">
                      {row.errors.length ? (
                        <span className="text-destructive">{row.errors.join(' ')}</span>
                      ) : (
                        <span className="text-primary">Ready</span>
                      )}
                      {row.warnings.length ? (
                        <span className="mt-1 block text-muted-foreground">{row.warnings.join(' ')}</span>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </PlacementTableCard>
        ) : null}

        {result ? (
          <PlacementSectionCard title="Import result">
            <p className="text-sm text-foreground">
              <span className="font-medium text-primary">{result.imported}</span> imported,{' '}
              <span className="font-medium text-[var(--term-amber)]">{result.skipped}</span> skipped
            </p>
            {result.errors.length ? (
              <ul className="mt-3 max-h-48 space-y-1 overflow-y-auto rounded-md border border-border bg-muted/30 p-3 font-mono text-xs text-muted-foreground">
                {result.errors.map((err) => (
                  <li key={`${err.row}-${err.message}`}>Row {err.row}: {err.message}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-primary">All valid rows imported successfully.</p>
            )}
          </PlacementSectionCard>
        ) : null}
      </PlacementPageStack>
    </PlacementShell>
  )
}
