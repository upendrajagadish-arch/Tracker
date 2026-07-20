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

/** Graduation year from profile fields (prefers graduation_year, then academic batch end year). */
export function resolveStudentGraduationYear(student: {
  graduation_year?: number | null
  academic_batch?: string | null
  batch?: string | null
}): number | null {
  if (student.graduation_year != null && Number.isFinite(Number(student.graduation_year))) {
    return Number(student.graduation_year)
  }
  const academic = String(student.academic_batch || student.batch || '').trim()
  const range = academic.match(/^(\d{4})\s*[-–]\s*(\d{4})$/)
  if (range) return Number(range[2])
  const yearOnly = academic.match(/^(\d{4})$/)
  if (yearOnly) return Number(yearOnly[1])
  return null
}

/**
 * Program / Pinnacle batch from the student `section` field.
 * Examples: "Ignite", "Connect", "1", "Batch 2", "Pinnacle-3", "B4"
 */
export function resolveStudentTrainingAssignment(section: string | null | undefined): {
  program: TrainingProgramId | null
  pinnacleBatch: PinnacleBatchNumber | null
} {
  const raw = String(section ?? '').trim().toLowerCase()
  if (!raw) return { program: null, pinnacleBatch: null }

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

  return { program: null, pinnacleBatch: null }
}

export function isTrainingYear(value: number): value is TrainingYear {
  return (TRAINING_YEARS as number[]).includes(value)
}
