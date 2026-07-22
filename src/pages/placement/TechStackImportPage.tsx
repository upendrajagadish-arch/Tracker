import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { PlacementLink } from '@/components/placement/PlacementLink'
import { PlacementShell, usePlacementPaths } from '@/components/placement/PlacementShell'
import { PlacementPageHeader } from '@/components/placement/PlacementPageHeader'
import { TechStackModuleNav } from '@/components/placement/TechStackModuleNav'
import { PlacementEmptyState } from '@/components/placement/PlacementStates'
import {
  PlacementAlerts,
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
import { listStudents } from '@/api/placement/students'
import {
  addStudentSkill,
  createTechSkill,
  listTechSkills,
  type ProficiencyLevel,
} from '@/api/placement/techSkills'
import { parseCsvText, sheetRowsToRecords } from '@/lib/studentImport'
import { readSpreadsheetRows } from '@/lib/spreadsheet'
import { canManageStudentTechStack } from '@/lib/placementPermissions'
import { useAuth } from '@/hooks/useAuth'

const TEMPLATE = `roll_number,skill_name,proficiency_level,assessed_by_name
CS2027001,Python,INTERMEDIATE,Dr. Rao
CS2027001,Java,BEGINNER,Dr. Rao
CS2027002,JavaScript,ADVANCED,Prof. Mehta`

async function parseUploadFile(file: File): Promise<Record<string, string>[]> {
  const lower = file.name.toLowerCase()
  if (lower.endsWith('.xls')) throw new Error('Legacy .xls files are not supported. Save as .xlsx or .csv.')
  if (lower.endsWith('.xlsx')) {
    const buffer = await file.arrayBuffer()
    return sheetRowsToRecords(await readSpreadsheetRows(buffer))
  }
  return parseCsvText(await file.text())
}

type PreviewRow = {
  rowNumber: number
  rollNumber: string
  skillName: string
  proficiency: ProficiencyLevel
  interviewer: string
  error?: string
}

export function TechStackImportPage() {
  const { placementRole } = useAuth()
  const { base } = usePlacementPaths()
  const canManage = canManageStudentTechStack(placementRole)
  const [preview, setPreview] = useState<PreviewRow[]>([])
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ created: number; failed: number; errors: string[] } | null>(null)

  if (!canManage) {
    return (
      <PlacementShell title="Tech Stack Bulk Upload">
        <PlacementEmptyState
          title="Not allowed"
          description="Only Admin, TPO, and Faculty can bulk-upload tech stack evaluations."
        />
      </PlacementShell>
    )
  }

  const handleFile = async (file: File | null) => {
    if (!file) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const records = await parseUploadFile(file)
      const rows: PreviewRow[] = records.map((record, index) => {
        const rollNumber = (record.roll_number || record.roll || '').trim()
        const skillName = (record.skill_name || record.skill || record.language || '').trim()
        const proficiencyRaw = (record.proficiency_level || record.proficiency || 'INTERMEDIATE').trim().toUpperCase()
        const proficiency = (['BEGINNER', 'INTERMEDIATE', 'ADVANCED'].includes(proficiencyRaw)
          ? proficiencyRaw
          : 'INTERMEDIATE') as ProficiencyLevel
        const interviewer = (record.assessed_by_name || record.interviewer || record.interviewer_name || '').trim()
        const errors: string[] = []
        if (!rollNumber) errors.push('Roll number required')
        if (!skillName) errors.push('Skill name required')
        if (!interviewer) errors.push('Interviewer name required')
        return {
          rowNumber: index + 2,
          rollNumber,
          skillName,
          proficiency,
          interviewer,
          error: errors.length ? errors.join('; ') : undefined,
        }
      })
      setPreview(rows)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to read file')
      setPreview([])
    } finally {
      setLoading(false)
    }
  }

  const handleImport = async () => {
    const valid = preview.filter((row) => !row.error)
    if (!valid.length) {
      setError('Fix validation errors before importing.')
      return
    }
    setImporting(true)
    setError(null)
    try {
      const studentsPage = await listStudents({ limit: 100, orderBy: 'roll_number' })
      // Fetch more pages if needed — load by roll via full list for now
      const allStudents: typeof studentsPage.data = [...studentsPage.data]
      if (studentsPage.pagination.pages > 1) {
        for (let page = 2; page <= Math.min(studentsPage.pagination.pages, 20); page += 1) {
          const next = await listStudents({ limit: 100, page, orderBy: 'roll_number' })
          allStudents.push(...next.data)
        }
      }
      const rollToId = new Map(allStudents.map((student) => [student.roll_number.trim().toLowerCase(), student.id]))
      let catalog = await listTechSkills(false)
      const skillByName = new Map(catalog.map((skill) => [skill.name.trim().toLowerCase(), skill]))

      let created = 0
      let failed = 0
      const errors: string[] = []

      for (const row of valid) {
        try {
          const studentId = rollToId.get(row.rollNumber.toLowerCase())
          if (!studentId) throw new Error(`Student roll ${row.rollNumber} not found`)
          let skill = skillByName.get(row.skillName.toLowerCase())
          if (!skill) {
            skill = await createTechSkill({
              name: row.skillName,
              category: 'PROGRAMMING_LANGUAGE',
            })
            catalog = [...catalog, skill]
            skillByName.set(skill.name.trim().toLowerCase(), skill)
          }
          await addStudentSkill(studentId, {
            techSkillId: skill.id,
            proficiencyLevel: row.proficiency,
            verificationStatus: 'FACULTY_VERIFIED',
            assessedByName: row.interviewer,
          })
          created += 1
        } catch (e) {
          failed += 1
          errors.push(`Row ${row.rowNumber}: ${e instanceof Error ? e.message : 'failed'}`)
        }
      }
      setResult({ created, failed, errors })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  const validCount = preview.filter((row) => !row.error).length

  return (
    <PlacementShell title="Tech Stack Bulk Upload">
      <PlacementPageHeader
        title="Bulk upload tech evaluations"
        description="Upload CSV/XLSX with roll_number, skill_name, proficiency_level, assessed_by_name."
        actions={
          base ? (
            <Button asChild size="sm" variant="outline">
              <PlacementLink href={`${base}/tech-stack`}>Dashboard</PlacementLink>
            </Button>
          ) : null
        }
      />
      <TechStackModuleNav />

      <PlacementPageStack>
        <PlacementAlerts error={error} />
        <PlacementSectionCard title="Upload file">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void navigator.clipboard.writeText(TEMPLATE)}
            >
              Copy template
            </Button>
            <Button type="button" size="sm" disabled={importing || !validCount} onClick={() => void handleImport()}>
              {importing ? 'Importing…' : `Import ${validCount || ''} rows`}
            </Button>
          </div>
          <input
            type="file"
            accept=".csv,.xlsx"
            className="mt-3 block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:border-border file:bg-muted/30 file:px-3 file:py-1.5"
            onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
          />
        </PlacementSectionCard>

        {loading ? <p className="text-sm text-muted-foreground">Validating…</p> : null}

        {preview.length ? (
          <PlacementTableCard title="Preview" count={`${validCount} ready`}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Row</TableHead>
                  <TableHead>Roll</TableHead>
                  <TableHead>Skill</TableHead>
                  <TableHead>Proficiency</TableHead>
                  <TableHead>Interviewer</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.map((row) => (
                  <TableRow key={row.rowNumber}>
                    <TableCell>{row.rowNumber}</TableCell>
                    <TableCell className="font-mono text-xs">{row.rollNumber || '—'}</TableCell>
                    <TableCell>{row.skillName || '—'}</TableCell>
                    <TableCell>{row.proficiency}</TableCell>
                    <TableCell>{row.interviewer || '—'}</TableCell>
                    <TableCell className={row.error ? 'text-destructive' : 'text-primary'}>
                      {row.error || 'Ready'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </PlacementTableCard>
        ) : null}

        {result ? (
          <PlacementSectionCard title="Import result">
            <p className="text-sm">
              <span className="font-medium text-primary">{result.created}</span> saved ·{' '}
              <span className="font-medium text-[var(--term-amber)]">{result.failed}</span> failed
            </p>
            {result.errors.length ? (
              <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto font-mono text-xs text-muted-foreground">
                {result.errors.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            ) : null}
          </PlacementSectionCard>
        ) : null}
      </PlacementPageStack>
    </PlacementShell>
  )
}
