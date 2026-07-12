import { requireSupabase } from '@/lib/supabase'
import { logPlacementAudit } from '@/lib/placementAudit'
import {
  parseCsvText,
  previewStudentImport,
  type ImportPreviewResult,
  type StudentImportMode,
} from '@/lib/studentImport'
import type { Database, Json } from '@/types/supabase'
import type { PlatformHandles } from '@/lib/studentPlatformHandles'

export type StudentProfileRow = Database['public']['Tables']['student_profiles']['Row']
export type StudentProfileInsert = Database['public']['Tables']['student_profiles']['Insert']
export type StudentProfileUpdate = Database['public']['Tables']['student_profiles']['Update']

export interface StudentListFilters {
  q?: string
  branch?: string
  batch?: string
  placementStatus?: string
  readinessStatus?: string
  isPlacementEligible?: boolean
  page?: number
  limit?: number
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
  dateOfBirth?: string | null
  cgpa?: number | null
  activeBacklogs?: number
  graduationYear?: number | null
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
}

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

function normalizePagination(page = 1, limit = DEFAULT_LIMIT) {
  const safePage = Math.max(1, page)
  const safeLimit = Math.min(Math.max(1, limit), MAX_LIMIT)
  return { page: safePage, limit: safeLimit, from: (safePage - 1) * safeLimit, to: safePage * safeLimit - 1 }
}

function toInsert(input: CreateStudentInput): StudentProfileInsert {
  return {
    roll_number: input.rollNumber.trim(),
    full_name: input.fullName.trim(),
    email: input.email?.trim() ?? '',
    phone: input.phone?.trim() ?? '',
    branch: input.branch?.trim() ?? '',
    batch: input.batch?.trim() ?? '',
    date_of_birth: input.dateOfBirth ?? null,
    cgpa: input.cgpa ?? null,
    active_backlogs: input.activeBacklogs ?? 0,
    graduation_year: input.graduationYear ?? null,
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
  if (input.batch !== undefined) update.batch = input.batch.trim()
  if (input.dateOfBirth !== undefined) update.date_of_birth = input.dateOfBirth
  if (input.cgpa !== undefined) update.cgpa = input.cgpa
  if (input.activeBacklogs !== undefined) update.active_backlogs = input.activeBacklogs
  if (input.graduationYear !== undefined) update.graduation_year = input.graduationYear
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
    .order('updated_at', { ascending: false })

  if (filters.branch) query = query.eq('branch', filters.branch)
  if (filters.batch) query = query.eq('batch', filters.batch)
  if (filters.placementStatus) query = query.eq('placement_status', filters.placementStatus)
  if (filters.readinessStatus) query = query.eq('readiness_status', filters.readinessStatus)
  if (filters.isPlacementEligible !== undefined) query = query.eq('is_placement_eligible', filters.isPlacementEligible)
  if (filters.q?.trim()) {
    const term = `%${filters.q.trim()}%`
    query = query.or(`full_name.ilike.${term},roll_number.ilike.${term},email.ilike.${term}`)
  }

  const { data, error, count } = await query.range(from, to)
  if (error) throw error
  const total = count ?? 0
  return {
    data: data ?? [],
    pagination: {
      page,
      limit,
      total,
      pages: total ? Math.ceil(total / limit) : 0,
    },
  }
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

export async function previewStudentsImport(
  records: Record<string, string>[],
  mode: StudentImportMode,
): Promise<ImportPreviewResult> {
  const existingRollNumbers = await listExistingRollNumbers()
  return previewStudentImport(records, mode, existingRollNumbers)
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
        graduationYear: assignment.graduationYear ?? (Number(assignment.batch) || null),
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
      description: `Assigned branch/year for ${updated} students`,
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
