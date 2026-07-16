/** Academic Batch helpers — e.g. 2023-2027 (4-year default). */

const RANGE_RE = /^(\d{4})\s*[-–]\s*(\d{4})$/
const YEAR_RE = /^(\d{4})$/

export function formatAcademicBatch(admissionYear: number | null | undefined, graduationYear: number | null | undefined): string {
  if (admissionYear == null || graduationYear == null) return ''
  return `${admissionYear}-${graduationYear}`
}

export function parseAcademicBatch(value: string | null | undefined): {
  admissionYear: number | null
  graduationYear: number | null
  academicBatch: string
} {
  const trimmed = String(value ?? '').trim()
  if (!trimmed) return { admissionYear: null, graduationYear: null, academicBatch: '' }

  const range = trimmed.match(RANGE_RE)
  if (range) {
    const admissionYear = Number(range[1])
    const graduationYear = Number(range[2])
    return {
      admissionYear,
      graduationYear,
      academicBatch: formatAcademicBatch(admissionYear, graduationYear),
    }
  }

  const year = trimmed.match(YEAR_RE)
  if (year) {
    const graduationYear = Number(year[1])
    const admissionYear = graduationYear - 4
    return {
      admissionYear,
      graduationYear,
      academicBatch: formatAcademicBatch(admissionYear, graduationYear),
    }
  }

  return { admissionYear: null, graduationYear: null, academicBatch: trimmed }
}

/** Derive admission / graduation / academic_batch using the 4-year rule when needed. */
export function deriveAcademicBatchFields(input: {
  academicBatch?: string | null
  batch?: string | null
  admissionYear?: number | null
  graduationYear?: number | null
}): {
  admissionYear: number | null
  graduationYear: number | null
  academicBatch: string
  batch: string
} {
  if (input.admissionYear != null && input.graduationYear != null) {
    const academicBatch = formatAcademicBatch(input.admissionYear, input.graduationYear)
    return {
      admissionYear: input.admissionYear,
      graduationYear: input.graduationYear,
      academicBatch,
      batch: academicBatch,
    }
  }

  const fromExplicit = parseAcademicBatch(input.academicBatch)
  if (fromExplicit.admissionYear != null && fromExplicit.graduationYear != null) {
    return {
      ...fromExplicit,
      batch: fromExplicit.academicBatch,
    }
  }

  if (input.graduationYear != null) {
    const admissionYear = input.admissionYear ?? input.graduationYear - 4
    const academicBatch = formatAcademicBatch(admissionYear, input.graduationYear)
    return {
      admissionYear,
      graduationYear: input.graduationYear,
      academicBatch,
      batch: academicBatch,
    }
  }

  const fromBatch = parseAcademicBatch(input.batch)
  if (fromBatch.admissionYear != null && fromBatch.graduationYear != null) {
    return {
      ...fromBatch,
      batch: fromBatch.academicBatch,
    }
  }

  const fallback = String(input.academicBatch || input.batch || '').trim()
  return {
    admissionYear: input.admissionYear ?? null,
    graduationYear: input.graduationYear ?? null,
    academicBatch: fallback,
    batch: fallback,
  }
}

/** Display label: prefer academic_batch, then legacy batch. */
export function displayAcademicBatch(row: {
  academic_batch?: string | null
  batch?: string | null
  admission_year?: number | null
  graduation_year?: number | null
}): string {
  if (row.academic_batch?.trim()) return row.academic_batch.trim()
  if (row.admission_year != null && row.graduation_year != null) {
    return formatAcademicBatch(row.admission_year, row.graduation_year)
  }
  return String(row.batch ?? '').trim() || '—'
}
