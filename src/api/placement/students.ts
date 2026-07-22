import { requireSupabase } from '@/lib/supabase'
import { logPlacementAudit } from '@/lib/placementAudit'
import { deriveAcademicBatchFields } from '@/lib/academicBatch'
import {
  parseCsvText,
  previewStudentImport,
  type ImportPreviewResult,
  type StudentImportMode,
} from '@/lib/studentImport'
import {
  trainingProgramSectionValue,
  resolveStudentGraduationYear,
  type PinnacleBatchNumber,
  type TrainingProgramId,
} from '@/lib/trainingPrograms'
import type { Database, Json } from '@/types/supabase'
import type { PlatformHandles } from '@/lib/studentPlatformHandles'

export type StudentProfileRow = Database['public']['Tables']['student_profiles']['Row']
export type StudentProfileInsert = Database['public']['Tables']['student_profiles']['Insert']
export type StudentProfileUpdate = Database['public']['Tables']['student_profiles']['Update']

export interface StudentListFilters {
  q?: string
  branch?: string
  batch?: string
  academicBatch?: string
  section?: string
  graduationYear?: number
  placementStatus?: string
  readinessStatus?: string
  isPlacementEligible?: boolean
  resumeMissing?: boolean
  resumePendingApproval?: boolean
  codingConnected?: boolean
  codingMissing?: boolean
  communicationPending?: boolean
  aptitudePending?: boolean
  verbalPending?: boolean
  studentIds?: string[]
  page?: number
  limit?: number
  orderBy?: 'updated_at' | 'readiness_score' | 'roll_number' | 'full_name'
  orderAscending?: boolean
}

export interface PaginatedResult<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export interface CreateStudentInput {
  rollNumber: string
  fullName: string
  email?: string
  phone?: string
  branch?: string
  batch?: string
  academicBatch?: string
  admissionYear?: number | null
  graduationYear?: number | null
  section?: string
  address?: string
  certificationsSummary?: string
  internshipSummary?: string
  dateOfBirth?: string | null
  cgpa?: number | null
  activeBacklogs?: number
  placementStatus?: string
  linkedinUrl?: string
  githubUrl?: string
  portfolioUrl?: string
  skillsSummary?: string
  careerInterest?: string
  platformHandles?: PlatformHandles
  projectsSummary?: string
  isPlacementEligible?: boolean
}

export interface UpdateStudentInput extends Partial<CreateStudentInput> {
  isActive?: boolean
}

export type { ImportPreviewResult, StudentImportMode }

export interface BulkAssignInput {
  studentId: string
  branch: string
  batch: string
  graduationYear?: number | null
  admissionYear?: number | null
  academicBatch?: string
  section?: string
}

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

function normalizePagination(page = 1, limit = DEFAULT_LIMIT) {
  const safePage = Math.max(1, page)
  const safeLimit = Math.min(Math.max(1, limit), MAX_LIMIT)
  return { page: safePage, limit: safeLimit, from: (safePage - 1) * safeLimit, to: safePage * safeLimit - 1 }
}

function toInsert(input: CreateStudentInput): StudentProfileInsert {
  const academic = deriveAcademicBatchFields({
    academicBatch: input.academicBatch,
    batch: input.batch,
    admissionYear: input.admissionYear,
    graduationYear: input.graduationYear,
  })
  return {
    roll_number: input.rollNumber.trim(),
    full_name: input.fullName.trim(),
    email: input.email?.trim() ?? '',
    phone: input.phone?.trim() ?? '',
    branch: input.branch?.trim() ?? '',
    batch: academic.batch,
    academic_batch: academic.academicBatch || null,
    admission_year: academic.admissionYear,
    graduation_year: academic.graduationYear,
    section: input.section?.trim() ?? '',
    address: input.address?.trim() ?? '',
    certifications_summary: input.certificationsSummary?.trim() ?? '',
    internship_summary: input.internshipSummary?.trim() ?? '',
    date_of_birth: input.dateOfBirth ?? null,
    cgpa: input.cgpa ?? null,
    active_backlogs: input.activeBacklogs ?? 0,
    placement_status: input.placementStatus ?? 'NOT_STARTED',
    linkedin_url: input.linkedinUrl ?? '',
    github_url: input.githubUrl ?? '',
    portfolio_url: input.portfolioUrl ?? '',
    skills_summary: input.skillsSummary ?? '',
    career_interest: input.careerInterest ?? '',
    platform_handles: (input.platformHandles ?? {}) as Json,
    projects_summary: input.projectsSummary ?? '',
    is_placement_eligible: input.isPlacementEligible ?? true,
  }
}

function toUpdate(input: UpdateStudentInput): StudentProfileUpdate {
  const update: StudentProfileUpdate = {}
  if (input.rollNumber !== undefined) update.roll_number = input.rollNumber.trim()
  if (input.fullName !== undefined) update.full_name = input.fullName.trim()
  if (input.email !== undefined) update.email = input.email.trim()
  if (input.phone !== undefined) update.phone = input.phone.trim()
  if (input.branch !== undefined) update.branch = input.branch.trim()
  if (input.section !== undefined) update.section = input.section.trim()
  if (input.address !== undefined) update.address = input.address.trim()
  if (input.certificationsSummary !== undefined) update.certifications_summary = input.certificationsSummary.trim()
  if (input.internshipSummary !== undefined) update.internship_summary = input.internshipSummary.trim()
  if (
    input.batch !== undefined
    || input.academicBatch !== undefined
    || input.admissionYear !== undefined
    || input.graduationYear !== undefined
  ) {
    const academic = deriveAcademicBatchFields({
      academicBatch: input.academicBatch,
      batch: input.batch,
      admissionYear: input.admissionYear,
      graduationYear: input.graduationYear,
    })
    update.batch = academic.batch
    update.academic_batch = academic.academicBatch || null
    update.admission_year = academic.admissionYear
    update.graduation_year = academic.graduationYear
  }
  if (input.dateOfBirth !== undefined) update.date_of_birth = input.dateOfBirth
  if (input.cgpa !== undefined) update.cgpa = input.cgpa
  if (input.activeBacklogs !== undefined) update.active_backlogs = input.activeBacklogs
  if (input.placementStatus !== undefined) update.placement_status = input.placementStatus
  if (input.linkedinUrl !== undefined) update.linkedin_url = input.linkedinUrl
  if (input.githubUrl !== undefined) update.github_url = input.githubUrl
  if (input.portfolioUrl !== undefined) update.portfolio_url = input.portfolioUrl
  if (input.skillsSummary !== undefined) update.skills_summary = input.skillsSummary
  if (input.careerInterest !== undefined) update.career_interest = input.careerInterest
  if (input.platformHandles !== undefined) update.platform_handles = input.platformHandles as Json
  if (input.projectsSummary !== undefined) update.projects_summary = input.projectsSummary
  if (input.isPlacementEligible !== undefined) update.is_placement_eligible = input.isPlacementEligible
  if (input.isActive !== undefined) update.is_active = input.isActive
  return update
}

export async function listStudents(filters: StudentListFilters = {}): Promise<PaginatedResult<StudentProfileRow>> {
  const client = requireSupabase()
  const { page, limit, from, to } = normalizePagination(filters.page, filters.limit)

  let query = client
    .from('student_profiles')
    .select('*', { count: 'exact' })
    .eq('is_active', true)
    .order(filters.orderBy ?? 'updated_at', {
      ascending: filters.orderAscending ?? false,
    })

  if (filters.branch) query = query.eq('branch', filters.branch)
  const batchValue = filters.academicBatch || filters.batch
  if (batchValue) {
    query = query.or(`academic_batch.eq.${batchValue},batch.eq.${batchValue}`)
  }
  if (filters.section) {
    const section = filters.section.trim()
    const batchNumber = section.match(/\b([1-4])\b/)?.[1]
    if (/batch|pinnacle/i.test(section) && batchNumber) {
      query = query.or(
        [
          `section.eq.${batchNumber}`,
          `section.ilike."Batch ${batchNumber}"`,
          `section.ilike."%Batch ${batchNumber}%"`,
          `section.ilike."%Pinnacle-${batchNumber}%"`,
          `section.ilike."%Pinnacle ${batchNumber}%"`,
        ].join(','),
      )
    } else if (/^(ignite|connect)$/i.test(section)) {
      query = query.ilike('section', `%${section}%`)
    } else {
      query = query.eq('section', section)
    }
  }
  if (filters.graduationYear != null) {
    const year = filters.graduationYear
    // Admission year from RCEE rolls (e.g. pass-out 2028 → roll prefix 24).
    const rollPrefix = String(year - 4).slice(-2)
    // Broad fetch — exact cohort matching uses resolveStudentGraduationYear below.
    query = query.or(
      [
        `graduation_year.eq.${year}`,
        `academic_batch.ilike."%-${year}"`,
        `academic_batch.eq.${year}`,
        `batch.eq.${year}`,
        `roll_number.ilike.${rollPrefix}%`,
      ].join(','),
    )
  }
  if (filters.placementStatus) query = query.eq('placement_status', filters.placementStatus)
  if (filters.readinessStatus) query = query.eq('readiness_status', filters.readinessStatus)
  if (filters.isPlacementEligible !== undefined) query = query.eq('is_placement_eligible', filters.isPlacementEligible)
  if (filters.communicationPending) query = query.is('communication_score', null)
  if (filters.aptitudePending) query = query.is('aptitude_score', null)
  if (filters.verbalPending) query = query.is('verbal_score', null)
  if (filters.studentIds?.length) query = query.in('id', filters.studentIds)
  if (filters.q?.trim()) {
    const term = `%${filters.q.trim()}%`
    query = query.or(`full_name.ilike.${term},roll_number.ilike.${term},email.ilike.${term}`)
  }

  // When filtering by year, pull a wider page then rank client-side so Top 5 is true for that year.
  const yearScoped = filters.graduationYear != null
  const fetchTo = yearScoped ? Math.max(to, 499) : to
  const { data, error, count } = await query.range(from, yearScoped ? fetchTo : to)
  if (error) throw error

  let rows = data ?? []

  if (filters.graduationYear != null) {
    rows = rows.filter((row) => resolveStudentGraduationYear(row) === filters.graduationYear)
  }

  // Post-filter resume / coding flags (keeps query simple and compatible)
  if (filters.resumeMissing || filters.resumePendingApproval || filters.codingConnected || filters.codingMissing) {
    const ids = rows.map((r) => r.id)
    const resumeMap = new Map<string, { review_status: string }>()
    if (ids.length && (filters.resumeMissing || filters.resumePendingApproval)) {
      const { data: resumes } = await client
        .from('student_resumes')
        .select('student_profile_id, review_status')
        .eq('is_active', true)
        .in('student_profile_id', ids)
      for (const resume of resumes ?? []) {
        resumeMap.set(resume.student_profile_id, { review_status: resume.review_status })
      }
    }
    rows = rows.filter((row) => {
      if (filters.resumeMissing && resumeMap.has(row.id)) return false
      if (filters.resumePendingApproval) {
        const resume = resumeMap.get(row.id)
        if (!resume || resume.review_status !== 'pending') return false
      }
      const handles = (row.platform_handles ?? {}) as Record<string, unknown>
      const hasCoding = Boolean(row.github_url?.trim()) || Object.values(handles).some((v) => String(v ?? '').trim())
      if (filters.codingConnected && !hasCoding) return false
      if (filters.codingMissing && hasCoding) return false
      return true
    })
  }

  if (yearScoped) {
    const orderBy = filters.orderBy ?? 'updated_at'
    const ascending = filters.orderAscending ?? false
    rows = [...rows].sort((a, b) => {
      const av = a[orderBy]
      const bv = b[orderBy]
      if (typeof av === 'number' && typeof bv === 'number') {
        return ascending ? av - bv : bv - av
      }
      return ascending
        ? String(av ?? '').localeCompare(String(bv ?? ''), undefined, { numeric: true })
        : String(bv ?? '').localeCompare(String(av ?? ''), undefined, { numeric: true })
    })
    const totalFiltered = rows.length
    rows = rows.slice(0, limit)
    return {
      data: rows,
      pagination: {
        page: 1,
        limit,
        total: totalFiltered,
        pages: totalFiltered ? Math.ceil(totalFiltered / limit) : 0,
      },
    }
  }

  const total = count ?? 0
  return {
    data: rows,
    pagination: {
      page,
      limit,
      total,
      pages: total ? Math.ceil(total / limit) : 0,
    },
  }
}

export async function getStudentByRollNumber(rollNumber: string): Promise<StudentProfileRow | null> {
  const client = requireSupabase()
  const clean = rollNumber.trim()
  if (!clean) return null
  const { data, error } = await client
    .from('student_profiles')
    .select('*')
    .ilike('roll_number', clean)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function getStudent(studentId: string): Promise<StudentProfileRow | null> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('student_profiles')
    .select('*')
    .eq('id', studentId)
    .maybeSingle()
  if (error) throw error
  return data
}

export type ProgramBatchStudent = Pick<
  StudentProfileRow,
  | 'id'
  | 'roll_number'
  | 'full_name'
  | 'email'
  | 'branch'
  | 'batch'
  | 'academic_batch'
  | 'graduation_year'
  | 'section'
  | 'cgpa'
  | 'placement_status'
  | 'readiness_score'
  | 'readiness_status'
  | 'profile_completeness'
>

/** Active students for training-year dashboards (filtered by graduation year). */
export async function listStudentsForTrainingYears(years: number[]): Promise<ProgramBatchStudent[]> {
  const uniqueYears = [...new Set(years.filter((year) => Number.isFinite(year)))]
  if (!uniqueYears.length) return []

  const client = requireSupabase()
  const rows: ProgramBatchStudent[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await client
      .from('student_profiles')
      .select(
        'id,roll_number,full_name,email,branch,batch,academic_batch,graduation_year,section,cgpa,placement_status,readiness_score,readiness_status,profile_completeness',
      )
      .eq('is_active', true)
      .order('roll_number')
      .range(from, from + 999)
    if (error) throw error
    rows.push(...(data ?? []))
    if (!data || data.length < 1000) break
  }

  return rows.filter((student) => {
    const year = resolveStudentGraduationYear(student)
    return year != null && uniqueYears.includes(year)
  })
}

export function programBatchStudentsToCsv(students: ProgramBatchStudent[]): string {
  const escape = (value: unknown) => {
    const raw = value == null ? '' : String(value)
    const text = /^[=+\-@]/.test(raw) ? `'${raw}` : raw
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
  }
  const header = [
    'Roll Number',
    'Name',
    'Email',
    'Branch',
    'Academic Batch',
    'Graduation Year',
    'Section / Program Batch',
    'CGPA',
    'Placement Status',
    'Readiness Score',
    'Readiness Status',
    'Profile Completeness',
  ]
  const lines = [header.join(',')]
  for (const student of students) {
    lines.push(
      [
        escape(student.roll_number),
        escape(student.full_name),
        escape(student.email),
        escape(student.branch),
        escape(student.academic_batch || student.batch),
        escape(student.graduation_year),
        escape(student.section),
        escape(student.cgpa),
        escape(student.placement_status),
        escape(student.readiness_score),
        escape(student.readiness_status),
        escape(student.profile_completeness),
      ].join(','),
    )
  }
  return lines.join('\n')
}

export async function createStudent(input: CreateStudentInput): Promise<StudentProfileRow> {
  if (!input.rollNumber.trim()) throw new Error('Roll number is required.')
  if (!input.fullName.trim()) throw new Error('Full name is required.')

  const client = requireSupabase()
  const { data, error } = await client
    .from('student_profiles')
    .insert(toInsert(input))
    .select()
    .single()
  if (error) throw error

  await logPlacementAudit({
    action: 'student.create',
    entityType: 'student_profile',
    entityId: data.id,
    description: `Created student ${data.roll_number}`,
    metadata: { rollNumber: data.roll_number },
  })

  return data
}

export async function updateStudent(studentId: string, input: UpdateStudentInput): Promise<StudentProfileRow> {
  const client = requireSupabase()
  const update = toUpdate(input)
  if (!Object.keys(update).length) throw new Error('No fields to update.')

  const { data, error } = await client
    .from('student_profiles')
    .update(update)
    .eq('id', studentId)
    .select()
    .single()
  if (error) throw error

  await logPlacementAudit({
    action: 'student.update',
    entityType: 'student_profile',
    entityId: data.id,
    description: `Updated student ${data.roll_number}`,
    metadata: { fields: Object.keys(update) },
  })

  return data
}

/** Soft-delete a student profile (keeps history; hides from active dashboards). */
export async function deleteStudent(studentId: string): Promise<void> {
  const client = requireSupabase()
  const { data: existing, error: loadError } = await client
    .from('student_profiles')
    .select('id, roll_number, full_name, is_active')
    .eq('id', studentId)
    .maybeSingle()
  if (loadError) throw loadError
  if (!existing) throw new Error('Student not found.')

  const { error } = await client
    .from('student_profiles')
    .update({ is_active: false })
    .eq('id', studentId)
  if (error) throw error

  await logPlacementAudit({
    action: 'student.delete',
    entityType: 'student_profile',
    entityId: studentId,
    description: `Deleted student ${existing.roll_number} (${existing.full_name})`,
    metadata: { rollNumber: existing.roll_number, soft: true },
  })
}

export interface CsvImportResult {
  imported: number
  skipped: number
  errors: Array<{ row: number; message: string }>
}

export async function listExistingRollNumbers(): Promise<Set<string>> {
  const client = requireSupabase()
  const { data, error } = await client.from('student_profiles').select('roll_number')
  if (error) throw error
  return new Set((data ?? []).map((row) => row.roll_number))
}

export async function listStudentIdsByRollNumber(): Promise<Map<string, string>> {
  const client = requireSupabase()
  const { data, error } = await client.from('student_profiles').select('id,roll_number')
  if (error) throw error
  const map = new Map<string, string>()
  for (const row of data ?? []) {
    if (row.roll_number) map.set(row.roll_number, row.id)
  }
  return map
}

async function listStudentYearByRollNumber(): Promise<
  Map<string, { id: string; passOutYear: number | null }>
> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('student_profiles')
    .select('id,roll_number,graduation_year,academic_batch,batch')
  if (error) throw error
  const map = new Map<string, { id: string; passOutYear: number | null }>()
  for (const row of data ?? []) {
    if (!row.roll_number) continue
    map.set(row.roll_number, {
      id: row.id,
      passOutYear: resolveStudentGraduationYear(row),
    })
  }
  return map
}

export async function previewStudentsImport(
  records: Record<string, string>[],
  mode: StudentImportMode,
  options?: { allowUpdateExisting?: boolean },
): Promise<ImportPreviewResult> {
  const existingRollNumbers = await listExistingRollNumbers()
  return previewStudentImport(records, mode, existingRollNumbers, options)
}

export async function importValidatedStudents(
  inputs: CreateStudentInput[],
): Promise<CsvImportResult> {
  const result: CsvImportResult = { imported: 0, skipped: 0, errors: [] }
  for (let i = 0; i < inputs.length; i += 1) {
    try {
      await createStudent(inputs[i])
      result.imported += 1
    } catch (error) {
      result.skipped += 1
      result.errors.push({
        row: i + 1,
        message: error instanceof Error ? error.message : 'Import failed.',
      })
    }
  }

  await logPlacementAudit({
    action: 'student.import_validated',
    entityType: 'student_profile',
    description: `Imported ${result.imported} students after validation`,
    metadata: { imported: result.imported, skipped: result.skipped, errorCount: result.errors.length },
  })

  return result
}

export interface TrainingProgramImportAssignment {
  year: number
  program: TrainingProgramId
  pinnacleBatch?: PinnacleBatchNumber | null
}

export interface TrainingProgramImportResult extends CsvImportResult {
  created: number
  updated: number
}

function withTrainingProgramAssignment(
  input: CreateStudentInput,
  assignment: TrainingProgramImportAssignment,
): CreateStudentInput {
  const section = trainingProgramSectionValue(assignment.program, assignment.pinnacleBatch)
  const year = String(assignment.year)
  return {
    ...input,
    section,
    graduationYear: assignment.year,
    academicBatch: year,
    batch: year,
  }
}

export async function importStudentsIntoTrainingProgram(
  records: Record<string, string>[],
  assignment: TrainingProgramImportAssignment,
): Promise<TrainingProgramImportResult> {
  if (assignment.program === 'pinnacle' && !assignment.pinnacleBatch) {
    throw new Error('Select a Pinnacle batch (1–4) before uploading.')
  }

  const rollToProfile = await listStudentYearByRollNumber()
  const preview = previewStudentImport(
    records,
    'quick',
    new Set(rollToProfile.keys()),
    { allowUpdateExisting: true },
  )

  const result: TrainingProgramImportResult = {
    imported: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: preview.rows
      .filter((row) => row.errors.length)
      .flatMap((row) => row.errors.map((message) => ({ row: row.rowNumber, message }))),
  }

  for (const row of preview.rows) {
    if (!row.input || row.errors.length) {
      if (row.errors.length) result.skipped += 1
      continue
    }

    const payload = withTrainingProgramAssignment(row.input, assignment)
    const existing = rollToProfile.get(payload.rollNumber.trim())

    try {
      if (existing) {
        // Never move a student from their existing pass-out year into another year card.
        if (existing.passOutYear != null && existing.passOutYear !== assignment.year) {
          result.skipped += 1
          result.errors.push({
            row: row.rowNumber,
            message: `${payload.rollNumber} is pass-out ${existing.passOutYear}; cannot assign into ${assignment.year}.`,
          })
          continue
        }
        await updateStudent(existing.id, {
          fullName: payload.fullName,
          email: payload.email || undefined,
          phone: payload.phone || undefined,
          branch: payload.branch || undefined,
          section: payload.section,
          graduationYear: existing.passOutYear ?? payload.graduationYear,
          academicBatch:
            existing.passOutYear != null
              ? `${existing.passOutYear - 4}-${existing.passOutYear}`
              : payload.academicBatch,
          batch: existing.passOutYear != null ? String(existing.passOutYear) : payload.batch,
        })
        result.updated += 1
      } else {
        await createStudent(payload)
        result.created += 1
      }
      result.imported += 1
    } catch (error) {
      result.skipped += 1
      result.errors.push({
        row: row.rowNumber,
        message: error instanceof Error ? error.message : 'Import failed.',
      })
    }
  }

  await logPlacementAudit({
    action: 'student.import_training_program',
    entityType: 'student_profile',
    description: `Imported ${result.imported} students into ${assignment.program} ${assignment.year}`,
    metadata: {
      program: assignment.program,
      year: assignment.year,
      pinnacleBatch: assignment.pinnacleBatch ?? null,
      created: result.created,
      updated: result.updated,
      skipped: result.skipped,
      errorCount: result.errors.length,
    },
  })

  return result
}

export async function importStudentsCsv(csvText: string, mode: StudentImportMode = 'full'): Promise<CsvImportResult> {
  const records = parseCsvText(csvText)
  const preview = await previewStudentsImport(records, mode)
  const validInputs = preview.rows
    .filter((row) => row.input && !row.errors.length)
    .map((row) => row.input!)

  if (!validInputs.length) {
    return {
      imported: 0,
      skipped: preview.rows.length,
      errors: preview.rows.flatMap((row) =>
        row.errors.map((message) => ({ row: row.rowNumber, message })),
      ),
    }
  }

  return importValidatedStudents(validInputs)
}

export async function bulkAssignStudents(assignments: BulkAssignInput[]): Promise<{ updated: number; errors: string[] }> {
  const errors: string[] = []
  let updated = 0

  for (const assignment of assignments) {
    if (!assignment.branch.trim() || !assignment.batch.trim()) {
      errors.push(`${assignment.studentId}: branch and year are required.`)
      continue
    }
    try {
      await updateStudent(assignment.studentId, {
        branch: assignment.branch.trim(),
        batch: assignment.batch.trim(),
        academicBatch: assignment.academicBatch ?? assignment.batch.trim(),
        admissionYear: assignment.admissionYear,
        graduationYear: assignment.graduationYear ?? (Number(assignment.batch) || null),
        section: assignment.section,
      })
      updated += 1
    } catch (error) {
      errors.push(error instanceof Error ? error.message : `Failed to update ${assignment.studentId}`)
    }
  }

  if (updated) {
    await logPlacementAudit({
      action: 'student.bulk_assign',
      entityType: 'student_profile',
      description: `Assigned branch/academic batch for ${updated} students`,
      metadata: { updated, errorCount: errors.length },
    })
  }

  return { updated, errors }
}

export async function listStudentsNeedingAssignment(limit = 200): Promise<StudentProfileRow[]> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('student_profiles')
    .select('*')
    .eq('is_active', true)
    .order('full_name', { ascending: true })
    .limit(limit)
  if (error) throw error
  return (data ?? []).filter((student) => !student.branch?.trim() || !student.batch?.trim())
}
