import { useRef, useState } from 'react'
import { Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  importStudentsIntoTrainingProgram,
  previewStudentsImport,
  type ImportPreviewResult,
  type TrainingProgramImportResult,
} from '@/api/placement/students'
import {
  IMPORT_TEMPLATE_TRAINING_PROGRAM,
  parseCsvText,
  sheetRowsToRecords,
} from '@/lib/studentImport'
import { readSpreadsheetRows } from '@/lib/spreadsheet'
import {
  PINNACLE_BATCHES,
  pinnacleBatchLabel,
  trainingProgramLabel,
  type PinnacleBatchNumber,
  type TrainingProgramId,
  type TrainingYear,
} from '@/lib/trainingPrograms'

async function parseUploadFile(file: File): Promise<Record<string, string>[]> {
  const lower = file.name.toLowerCase()
  if (lower.endsWith('.xls')) {
    throw new Error('Legacy .xls files are not supported. Save as .xlsx or .csv.')
  }
  if (lower.endsWith('.xlsx')) {
    const buffer = await file.arrayBuffer()
    return sheetRowsToRecords(await readSpreadsheetRows(buffer))
  }
  return parseCsvText(await file.text())
}

export function TrainingProgramBulkUploadDialog({
  open,
  year,
  program,
  initialPinnacleBatch,
  onClose,
  onImported,
}: {
  open: boolean
  year: TrainingYear
  program: TrainingProgramId
  initialPinnacleBatch?: PinnacleBatchNumber | null
  onClose: () => void
  onImported: () => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [pinnacleBatch, setPinnacleBatch] = useState<PinnacleBatchNumber | ''>(
    initialPinnacleBatch ?? '',
  )
  const [fileName, setFileName] = useState<string | null>(null)
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<TrainingProgramImportResult | null>(null)

  if (!open) return null

  const validRows = preview?.rows.filter((row) => row.input && !row.errors.length) ?? []

  const resetFile = () => {
    setFileName(null)
    setPreview(null)
    setResult(null)
    if (fileRef.current) fileRef.current.value = ''
  }

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
      setPreview(await previewStudentsImport(records, 'quick', { allowUpdateExisting: true }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to read file')
      setPreview(null)
    } finally {
      setLoading(false)
    }
  }

  const handleImport = async () => {
    if (program === 'pinnacle' && !pinnacleBatch) {
      setError('Select Pinnacle Batch 1–4 before importing.')
      return
    }
    if (!preview || !validRows.length) {
      setError('Fix validation errors before importing.')
      return
    }
    setImporting(true)
    setError(null)
    try {
      const records = validRows.map((row) => row.raw)
      const res = await importStudentsIntoTrainingProgram(records, {
        year,
        program,
        pinnacleBatch: program === 'pinnacle' ? (pinnacleBatch as PinnacleBatchNumber) : null,
      })
      setResult(res)
      if (res.imported) onImported()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`Bulk upload ${trainingProgramLabel(program)} ${year}`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-primary/35 bg-[#0B0E11] shadow-[0_0_55px_-22px_rgba(210,121,24,0.9)]">
        <div className="flex items-start gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-heading text-lg font-bold text-foreground">
              Bulk upload · {trainingProgramLabel(program)} · {year}
            </h3>
            <p className="text-xs text-muted-foreground">
              New students are created in pass-out year {year}. Existing students already in another
              pass-out year are skipped — they stay in their own year dashboard.
            </p>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close bulk upload">
            <X className="size-4" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          {error ? <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}

          {program === 'pinnacle' ? (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pinnacle batch</p>
              <div className="flex flex-wrap gap-2">
                {PINNACLE_BATCHES.map((batch) => (
                  <Button
                    key={batch}
                    type="button"
                    size="sm"
                    variant={pinnacleBatch === batch ? 'default' : 'outline'}
                    onClick={() => setPinnacleBatch(batch)}
                  >
                    {pinnacleBatchLabel(batch)}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="rounded-xl border border-border bg-background/40 p-3">
            <p className="text-sm font-semibold text-foreground">Upload CSV / Excel</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Required columns: roll_number, full_name. Optional: email, branch, phone.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void navigator.clipboard.writeText(IMPORT_TEMPLATE_TRAINING_PROGRAM)}
              >
                Copy template
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={resetFile}>
                Clear file
              </Button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="mt-3 block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:border-border file:bg-muted/30 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground"
              onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
            />
            {fileName ? <p className="mt-2 font-mono text-xs text-muted-foreground">Selected: {fileName}</p> : null}
          </div>

          {loading ? <p className="text-sm text-muted-foreground">Validating file…</p> : null}

          {!loading && preview ? (
            <div className="overflow-hidden rounded-xl border border-border">
              <div className="border-b border-border px-3 py-2 text-sm font-semibold">
                Preview · {preview.validCount} ready · {preview.errorCount} issues
              </div>
              <div className="max-h-56 overflow-auto">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-elevated text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">Row</th>
                      <th className="px-3 py-2 font-medium">Roll</th>
                      <th className="px-3 py-2 font-medium">Name</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((row) => (
                      <tr key={row.rowNumber} className="border-t border-border/60">
                        <td className="px-3 py-2">{row.rowNumber}</td>
                        <td className="px-3 py-2 font-mono">{row.raw.roll_number || '—'}</td>
                        <td className="px-3 py-2">{row.raw.full_name || '—'}</td>
                        <td className="px-3 py-2">
                          {row.errors.length ? (
                            <span className="text-destructive">{row.errors.join(' ')}</span>
                          ) : (
                            <span className="text-primary">Ready</span>
                          )}
                          {row.warnings.length ? (
                            <span className="mt-1 block text-muted-foreground">{row.warnings.join(' ')}</span>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {result ? (
            <div className="rounded-xl border border-border bg-background/40 px-3 py-2 text-sm">
              <p>
                <span className="font-medium text-primary">{result.created}</span> created ·{' '}
                <span className="font-medium text-primary">{result.updated}</span> updated ·{' '}
                <span className="font-medium text-[var(--term-amber)]">{result.skipped}</span> skipped
              </p>
              {result.errors.length ? (
                <ul className="mt-2 max-h-28 space-y-1 overflow-y-auto font-mono text-xs text-muted-foreground">
                  {result.errors.map((err) => (
                    <li key={`${err.row}-${err.message}`}>Row {err.row}: {err.message}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border px-4 py-3">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={importing || !validRows.length || (program === 'pinnacle' && !pinnacleBatch)}
            onClick={() => void handleImport()}
          >
            <Upload className="size-3.5" />
            {importing ? 'Importing…' : `Import ${validRows.length || ''} students`}
          </Button>
        </div>
      </div>
    </div>
  )
}
