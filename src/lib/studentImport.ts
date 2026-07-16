import type { CreateStudentInput } from '@/api/placement/students'

export type StudentImportMode = 'full' | 'quick'

export interface ParsedImportRow {
  rowNumber: number
  input: CreateStudentInput | null
  raw: Record<string, string>
  errors: string[]
  warnings: string[]
}

export interface ImportPreviewResult {
  mode: StudentImportMode
  rows: ParsedImportRow[]
  validCount: number
  errorCount: number
  duplicateRollsInFile: string[]
}

export interface CsvImportResult {
  imported: number
  skipped: number
  errors: Array<{ row: number; message: string }>
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^[0-9+\-\s()]{7,20}$/

const HEADER_ALIASES: Record<string, string> = {
  roll_number: 'roll_number',
  rollnumber: 'roll_number',
  roll: 'roll_number',
  roll_no: 'roll_number',
  full_name: 'full_name',
  fullname: 'full_name',
  name: 'full_name',
  student_name: 'full_name',
  email: 'email',
  email_id: 'email',
  phone: 'phone',
  mobile: 'phone',
  mobile_number: 'phone',
  contact: 'phone',
  branch: 'branch',
  department: 'branch',
  batch: 'batch',
  year: 'batch',
  academic_batch: 'academic_batch',
  academicbatch: 'academic_batch',
  admission_year: 'admission_year',
  admissionyear: 'admission_year',
  graduation_year: 'graduation_year',
  graduationyear: 'graduation_year',
  section: 'section',
  address: 'address',
  certifications_summary: 'certifications_summary',
  certifications: 'certifications_summary',
  internship_summary: 'internship_summary',
  internship: 'internship_summary',
  date_of_birth: 'date_of_birth',
  dob: 'date_of_birth',
  birth_date: 'date_of_birth',
  cgpa: 'cgpa',
  active_backlogs: 'active_backlogs',
  backlogs: 'active_backlogs',
  placement_status: 'placement_status',
  placementstatus: 'placement_status',
  linkedin_url: 'linkedin_url',
  linkedin: 'linkedin_url',
  github_url: 'github_url',
  github: 'github_url',
  portfolio_url: 'portfolio_url',
  portfolio: 'portfolio_url',
  skills_summary: 'skills_summary',
  skills: 'skills_summary',
  career_interest: 'career_interest',
  careerinterest: 'career_interest',
  projects_summary: 'projects_summary',
  projects: 'projects_summary',
  is_placement_eligible: 'is_placement_eligible',
}

export function normalizeImportHeader(header: string): string {
  const key = header.trim().toLowerCase().replace(/\s+/g, '_')
  return HEADER_ALIASES[key] ?? key
}

export function parseCsvLine(line: string): string[] {
  const values: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }
    if (char === ',' && !inQuotes) {
      values.push(current.trim())
      current = ''
      continue
    }
    current += char
  }
  values.push(current.trim())
  return values
}

export function sheetRowsToRecords(rows: unknown[][]): Record<string, string>[] {
  if (!rows.length) return []
  const headers = (rows[0] ?? []).map((cell) => normalizeImportHeader(String(cell ?? '')))
  const records: Record<string, string>[] = []
  for (let i = 1; i < rows.length; i += 1) {
    const values = rows[i] ?? []
    const isEmpty = values.every((cell) => String(cell ?? '').trim() === '')
    if (isEmpty) continue
    const record: Record<string, string> = {}
    headers.forEach((header, index) => {
      if (!header) return
      record[header] = String(values[index] ?? '').trim()
    })
    records.push(record)
  }
  return records
}

export function parseCsvText(csvText: string): Record<string, string>[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  if (lines.length < 2) return []
  const headers = parseCsvLine(lines[0]).map((header) => normalizeImportHeader(header))
  const records: Record<string, string>[] = []
  for (let i = 1; i < lines.length; i += 1) {
    const values = parseCsvLine(lines[i])
    const record: Record<string, string> = {}
    headers.forEach((header, index) => {
      if (!header) return
      record[header] = values[index]?.trim() ?? ''
    })
    records.push(record)
  }
  return records
}

function parseDateOfBirth(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed
  const slash = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (slash) {
    const [, d, m, y] = slash
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  const parsed = new Date(trimmed)
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10)
  }
  return null
}

function recordToStudentInput(raw: Record<string, string>): CreateStudentInput | null {
  const rollNumber = raw.roll_number
  const fullName = raw.full_name
  if (!rollNumber || !fullName) return null

  const cgpaRaw = raw.cgpa
  const backlogsRaw = raw.active_backlogs
  const graduationRaw = raw.graduation_year
  const dobRaw = raw.date_of_birth

  return {
    rollNumber,
    fullName,
    email: raw.email,
    phone: raw.phone,
    branch: raw.branch,
    batch: raw.academic_batch || raw.batch,
    academicBatch: raw.academic_batch || raw.batch,
    admissionYear: raw.admission_year ? Number(raw.admission_year) : null,
    graduationYear: graduationRaw ? Number(graduationRaw) : null,
    section: raw.section,
    address: raw.address,
    certificationsSummary: raw.certifications_summary,
    internshipSummary: raw.internship_summary,
    dateOfBirth: dobRaw ? parseDateOfBirth(dobRaw) : null,
    cgpa: cgpaRaw ? Number(cgpaRaw) : null,
    activeBacklogs: backlogsRaw ? Number(backlogsRaw) : 0,
    placementStatus: raw.placement_status,
    linkedinUrl: raw.linkedin_url,
    githubUrl: raw.github_url,
    portfolioUrl: raw.portfolio_url,
    skillsSummary: raw.skills_summary,
    careerInterest: raw.career_interest,
    projectsSummary: raw.projects_summary,
    isPlacementEligible: raw.is_placement_eligible
      ? !['false', '0', 'no'].includes(raw.is_placement_eligible.toLowerCase())
      : true,
  }
}

function validateRow(raw: Record<string, string>, mode: StudentImportMode): string[] {
  const errors: string[] = []
  const rollNumber = raw.roll_number?.trim()
  const fullName = raw.full_name?.trim()
  const email = raw.email?.trim()
  const phone = raw.phone?.trim()
  const branch = raw.branch?.trim()
  const batch = raw.batch?.trim()
  const dob = raw.date_of_birth?.trim()

  if (!rollNumber) errors.push('Roll number is required.')
  if (!fullName) errors.push('Student name is required.')

  if (mode === 'full') {
    if (!email) errors.push('Email is required.')
    else if (!EMAIL_RE.test(email)) errors.push('Email format is invalid.')
    if (!phone) errors.push('Mobile number is required.')
    else if (!PHONE_RE.test(phone)) errors.push('Mobile number format is invalid.')
    if (!branch) errors.push('Branch / department is required.')
    if (!batch) errors.push('Academic batch is required.')
    if (!dob) errors.push('Date of birth is required.')
    else if (!parseDateOfBirth(dob)) errors.push('Date of birth format is invalid.')
  } else {
    if (email && !EMAIL_RE.test(email)) errors.push('Email format is invalid.')
    if (phone && !PHONE_RE.test(phone)) errors.push('Mobile number format is invalid.')
    if (dob && !parseDateOfBirth(dob)) errors.push('Date of birth format is invalid.')
  }

  if (raw.cgpa && Number.isNaN(Number(raw.cgpa))) errors.push('CGPA must be a number.')
  return errors
}

export function previewStudentImport(
  records: Record<string, string>[],
  mode: StudentImportMode,
  existingRollNumbers: Set<string> = new Set(),
): ImportPreviewResult {
  const seenRolls = new Map<string, number>()
  const duplicateRollsInFile: string[] = []

  const rows: ParsedImportRow[] = records.map((raw, index) => {
    const rowNumber = index + 2
    const errors = validateRow(raw, mode)
    const roll = raw.roll_number?.trim()

    if (roll) {
      if (seenRolls.has(roll)) {
        duplicateRollsInFile.push(roll)
        errors.push(`Duplicate roll number in file (also on row ${seenRolls.get(roll)}).`)
      } else {
        seenRolls.set(roll, rowNumber)
      }
      if (existingRollNumbers.has(roll)) {
        errors.push('Roll number already exists in the system.')
      }
    }

    const input = errors.length ? null : recordToStudentInput(raw)
    return {
      rowNumber,
      input,
      raw,
      errors,
      warnings: !raw.branch?.trim() || !raw.batch?.trim()
        ? ['Branch or year not set — faculty can assign later.']
        : [],
    }
  })

  return {
    mode,
    rows,
    validCount: rows.filter((row) => row.input && !row.errors.length).length,
    errorCount: rows.filter((row) => row.errors.length).length,
    duplicateRollsInFile: [...new Set(duplicateRollsInFile)],
  }
}

export const IMPORT_TEMPLATE_FULL = `roll_number,full_name,email,phone,branch,batch,date_of_birth,cgpa,github_url
CS2026001,Alex Kumar,alex@college.example,9876543210,CSE,2026,2004-05-12,8.4,https://github.com/alexk
CS2026002,Priya Sharma,priya@college.example,9876543211,ECE,2026,15/08/2004,9.1,https://github.com/priyas`

export const IMPORT_TEMPLATE_QUICK = `roll_number,full_name,email
CS2026003,Rahul Verma,rahul@college.example
CS2026004,Sneha Iyer,sneha@college.example`
