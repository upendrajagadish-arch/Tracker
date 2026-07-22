/** Training programs on Student Tracker: year tabs → Ignite / Pinnacle / Connect. */

export type TrainingProgramId = 'ignite' | 'pinnacle' | 'connect'
export type TrainingYear = 2027 | 2028 | 2029 | 2030
export type PinnacleBatchNumber = 1 | 2 | 3 | 4

export const TRAINING_YEARS: TrainingYear[] = [2027, 2028, 2029, 2030]
export const PINNACLE_BATCHES: PinnacleBatchNumber[] = [1, 2, 3, 4]

export interface TrainingProgram {
  id: TrainingProgramId
  label: string
  tagline: string
  accent: string
}

export const TRAINING_PROGRAMS: TrainingProgram[] = [
  {
    id: 'ignite',
    label: 'Ignite',
    tagline: 'Foundation readiness track',
    accent: '#E08A2A',
  },
  {
    id: 'pinnacle',
    label: 'Pinnacle',
    tagline: 'Core placement excellence — Batch 1 to Batch 4',
    accent: '#D27918',
  },
  {
    id: 'connect',
    label: 'Connect',
    tagline: 'Industry connect & outreach track',
    accent: '#0ECB81',
  },
]

export function pinnacleBatchLabel(batch: PinnacleBatchNumber): string {
  return `Batch ${batch}`
}

/** Graduation / pass-out year from profile fields.
 * Pass-out year is the dashboard cohort key (Ignite/Pinnacle/Connect can come later).
 * Priority: explicit graduation_year → academic_batch → non-program batch label → roll fallback.
 * Never move a student from their chosen pass-out year to another year via roll inference.
 */
export function resolveStudentGraduationYear(student: {
  graduation_year?: number | null
  academic_batch?: string | null
  batch?: string | null
  roll_number?: string | null
}): number | null {
  const validPassOut = (year: number | null | undefined): number | null => {
    if (year == null || !Number.isFinite(Number(year))) return null
    const value = Number(year)
    if (value < 2027 || value > 2035) return null
    return value
  }

  const parsePassOutFromLabel = (raw: string): number | null => {
    const value = raw.trim()
    if (!value) return null
    // Training program names are not pass-out years.
    if (/\b(ignite|pinnacle|connect)\b/i.test(value)) return null
    const range = value.match(/^(\d{4})\s*[-–]\s*(\d{4})$/)
    if (range) return validPassOut(Number(range[2]))
    const yearOnly = value.match(/^(\d{4})$/)
    if (yearOnly) return validPassOut(Number(yearOnly[1]))
    return null
  }

  const fromGraduation = validPassOut(
    student.graduation_year != null && Number.isFinite(Number(student.graduation_year))
      ? Number(student.graduation_year)
      : null,
  )
  if (fromGraduation != null) return fromGraduation

  const fromAcademic = parsePassOutFromLabel(String(student.academic_batch || ''))
  if (fromAcademic != null) return fromAcademic

  const fromBatch = parsePassOutFromLabel(String(student.batch || ''))
  if (fromBatch != null) return fromBatch

  const roll = String(student.roll_number || '').trim().toUpperCase()
  const rollMatch = roll.match(/^(\d{2})[A-Z]/)
  if (rollMatch) {
    const admission = 2000 + Number(rollMatch[1])
    if (admission >= 2018 && admission <= 2032) {
      return validPassOut(admission + 4)
    }
  }

  return null
}

/**
 * Program / Pinnacle batch from section, batch name, or academic label.
 * Examples: "Ignite", "Connect", "Pinnacle", "1", "Batch 2", "Pinnacle-3", "B4"
 */
export function resolveStudentTrainingAssignment(
  section?: string | null,
  batch?: string | null,
  academicBatch?: string | null,
): {
  program: TrainingProgramId | null
  pinnacleBatch: PinnacleBatchNumber | null
} {
  const candidates = [section, batch, academicBatch]
  for (const candidate of candidates) {
    const raw = String(candidate ?? '').trim().toLowerCase()
    if (!raw) continue

    if (/\bignite\b/.test(raw)) return { program: 'ignite', pinnacleBatch: null }
    if (/\bconnect\b/.test(raw)) return { program: 'connect', pinnacleBatch: null }

    const batchMatch =
      raw.match(/\bbatch\s*([1-4])\b/) ||
      raw.match(/\bpinnacle\s*[-_/]?\s*([1-4])\b/) ||
      raw.match(/^b\s*([1-4])$/) ||
      raw.match(/^([1-4])$/)

    if (batchMatch) {
      const n = Number(batchMatch[1]) as PinnacleBatchNumber
      return { program: 'pinnacle', pinnacleBatch: n }
    }

    if (/\bpinnacle\b/.test(raw)) return { program: 'pinnacle', pinnacleBatch: null }
  }

  return { program: null, pinnacleBatch: null }
}

export function trainingProgramLabel(id: TrainingProgramId): string {
  return TRAINING_PROGRAMS.find((program) => program.id === id)?.label ?? id
}

/** Canonical `section` value so training cards can resolve Ignite / Pinnacle / Connect. */
export function trainingProgramSectionValue(
  program: TrainingProgramId,
  pinnacleBatch?: PinnacleBatchNumber | null,
): string {
  if (program === 'pinnacle' && pinnacleBatch) return pinnacleBatchLabel(pinnacleBatch)
  return trainingProgramLabel(program)
}

/** Normalize registration input to a canonical program section value. */
export function normalizeTrainingProgramInput(value: string | null | undefined): string {
  const assignment = resolveStudentTrainingAssignment(value, value, value)
  if (!assignment.program) return String(value ?? '').trim()
  if (assignment.program === 'pinnacle' && assignment.pinnacleBatch) {
    return pinnacleBatchLabel(assignment.pinnacleBatch)
  }
  return trainingProgramLabel(assignment.program)
}

export function isTrainingYear(value: number): value is TrainingYear {
  return (TRAINING_YEARS as number[]).includes(value)
}
