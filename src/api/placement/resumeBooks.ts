import { requireSupabase } from '@/lib/supabase'
import { logPlacementAudit } from '@/lib/placementAudit'
import { listStudentSkills } from '@/api/placement/techSkills'
import { buildDossierExtras, dossierExtrasToSnapshotJson } from '@/lib/studentDossier'
import type { Database, Json } from '@/types/supabase'

export type ResumeBookRow = Database['public']['Tables']['resume_book_snapshots']['Row']
export type ResumeBookStudentRow = Database['public']['Tables']['resume_book_student_snapshots']['Row']

export interface ResumeBookFilters {
  branch?: string
  batch?: string
  minReadinessScore?: number
  readinessStatus?: string
  placementStatus?: string
  limit?: number
}

export interface GenerateBookInput {
  title: string
  description?: string
  bookType?: string
  filters?: ResumeBookFilters
}

export interface ShareLinkInput {
  expiresAt?: string | null
  shareSettings?: {
    allowResumeDownload?: boolean
    allowExternalLinks?: boolean
  }
}

export interface PaginatedBookStudents {
  data: ResumeBookStudentRow[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export interface PublicResumeBook {
  id: string
  title: string
  description: string
  totalStudents: number
  bookType: string
  shareSettings: Record<string, unknown>
  expiresAt: string | null
  expired?: boolean
}

function normalizePagination(page = 1, limit = 20) {
  const safePage = Math.max(1, page)
  const safeLimit = Math.min(Math.max(1, limit), 100)
  return { page: safePage, limit: safeLimit, from: (safePage - 1) * safeLimit, to: safePage * safeLimit - 1 }
}

function createShareToken(): string {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

function studentSnapshot(
  student: Database['public']['Tables']['student_profiles']['Row'],
  resume?: { id: string; storage_path: string } | null,
  extras?: ReturnType<typeof buildDossierExtras>,
): Json {
  const dossier = extras ? dossierExtrasToSnapshotJson(extras) as Record<string, unknown> : {}
  return {
    studentProfileId: student.id,
    rollNumber: student.roll_number,
    fullName: student.full_name,
    branch: student.branch,
    batch: student.batch,
    cgpa: student.cgpa,
    activeBacklogs: student.active_backlogs,
    readinessScore: student.readiness_score,
    readinessStatus: student.readiness_status,
    placementStatus: student.placement_status,
    skillsSummary: student.skills_summary,
    careerInterest: student.career_interest,
    linkedinUrl: student.linkedin_url,
    githubUrl: student.github_url,
    portfolioUrl: student.portfolio_url,
    email: student.email,
    phone: student.phone,
    projectsSummary: student.projects_summary ?? '',
    resumeStoragePath: resume?.storage_path ?? null,
    resumeId: resume?.id ?? null,
    ...dossier,
  } as Json
}

export async function listBooks(): Promise<ResumeBookRow[]> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('resume_book_snapshots')
    .select('*')
    .neq('status', 'archived')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function generateBook(input: GenerateBookInput): Promise<ResumeBookRow> {
  if (!input.title.trim()) throw new Error('Book title is required.')
  const client = requireSupabase()
  const filters = input.filters ?? {}

  let studentQuery = client
    .from('student_profiles')
    .select('*')
    .eq('is_active', true)
    .order('readiness_score', { ascending: false })

  if (filters.branch) studentQuery = studentQuery.eq('branch', filters.branch)
  if (filters.batch) studentQuery = studentQuery.eq('batch', filters.batch)
  if (filters.readinessStatus) studentQuery = studentQuery.eq('readiness_status', filters.readinessStatus)
  if (filters.placementStatus) studentQuery = studentQuery.eq('placement_status', filters.placementStatus)
  if (filters.minReadinessScore != null) studentQuery = studentQuery.gte('readiness_score', filters.minReadinessScore)
  if (filters.limit) studentQuery = studentQuery.limit(Math.min(filters.limit, 500))

  const { data: students, error: studentsError } = await studentQuery
  if (studentsError) throw studentsError

  const { data: auth } = await client.auth.getUser()

  const { data: book, error: bookError } = await client
    .from('resume_book_snapshots')
    .insert({
      title: input.title.trim(),
      description: input.description?.trim() ?? '',
      filters: filters as Json,
      total_students: students?.length ?? 0,
      book_type: input.bookType ?? 'readiness_based',
      status: 'generated',
      created_by: auth.user?.id ?? null,
    })
    .select()
    .single()
  if (bookError) throw bookError

  const snapshots: Database['public']['Tables']['resume_book_student_snapshots']['Insert'][] = []
  for (let index = 0; index < (students?.length ?? 0); index += 1) {
    const student = students![index]
    const { data: resume } = await client
      .from('student_resumes')
      .select('id, storage_path')
      .eq('student_profile_id', student.id)
      .eq('is_active', true)
      .maybeSingle()
    const techSkills = await listStudentSkills(student.id)
    const extras = buildDossierExtras(student, techSkills, resume)
    snapshots.push({
      resume_book_id: book.id,
      student_profile_id: student.id,
      order_index: index,
      snapshot: studentSnapshot(student, resume, extras),
    })
  }

  if (snapshots.length) {
    const { error: snapshotError } = await client.from('resume_book_student_snapshots').insert(snapshots)
    if (snapshotError) throw snapshotError
  }

  await logPlacementAudit({
    action: 'resume_book.generate',
    entityType: 'resume_book_snapshot',
    entityId: book.id,
    description: `Generated resume book ${book.title}`,
    metadata: { totalStudents: book.total_students },
  })

  return book
}

export async function getBookStudents(
  bookId: string,
  page = 1,
  limit = 20,
): Promise<PaginatedBookStudents> {
  const client = requireSupabase()
  const { page: safePage, limit: safeLimit, from, to } = normalizePagination(page, limit)

  const { data, error, count } = await client
    .from('resume_book_student_snapshots')
    .select('*', { count: 'exact' })
    .eq('resume_book_id', bookId)
    .order('order_index', { ascending: true })
    .range(from, to)
  if (error) throw error
  const total = count ?? 0
  return {
    data: data ?? [],
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      pages: total ? Math.ceil(total / safeLimit) : 0,
    },
  }
}

export async function createShareLink(bookId: string, input: ShareLinkInput = {}): Promise<ResumeBookRow> {
  const client = requireSupabase()
  const token = createShareToken()
  const { data, error } = await client
    .from('resume_book_snapshots')
    .update({
      share_token: token,
      is_shareable: true,
      expires_at: input.expiresAt ?? null,
      share_settings: {
        allowResumeDownload: input.shareSettings?.allowResumeDownload ?? true,
        allowExternalLinks: input.shareSettings?.allowExternalLinks ?? true,
      } as Json,
      status: 'generated',
    })
    .eq('id', bookId)
    .select()
    .single()
  if (error) throw error

  await logPlacementAudit({
    action: 'resume_book.share',
    entityType: 'resume_book_snapshot',
    entityId: data.id,
    description: `Created share link for resume book ${data.title}`,
  })

  return data
}

export async function archiveBook(bookId: string): Promise<ResumeBookRow> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('resume_book_snapshots')
    .update({
      status: 'archived',
      is_shareable: false,
      share_token: null,
    })
    .eq('id', bookId)
    .select()
    .single()
  if (error) throw error

  await logPlacementAudit({
    action: 'resume_book.archive',
    entityType: 'resume_book_snapshot',
    entityId: data.id,
    description: `Archived resume book ${data.title}`,
  })

  return data
}

export async function getPublicResumeBook(token: string): Promise<PublicResumeBook | null> {
  const client = requireSupabase()
  const { data, error } = await client.rpc('get_public_resume_book', { p_token: token })
  if (error) throw error
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null
  const payload = data as Record<string, unknown>
  if (payload.expired === true) {
    return {
      id: '',
      title: '',
      description: '',
      totalStudents: 0,
      bookType: '',
      shareSettings: {},
      expiresAt: null,
      expired: true,
    }
  }
  return {
    id: String(payload.id ?? ''),
    title: String(payload.title ?? ''),
    description: String(payload.description ?? ''),
    totalStudents: Number(payload.totalStudents ?? 0),
    bookType: String(payload.bookType ?? ''),
    shareSettings: (payload.shareSettings as Record<string, unknown>) ?? {},
    expiresAt: payload.expiresAt ? String(payload.expiresAt) : null,
  }
}

export async function getPublicResumeBookStudents(
  token: string,
  page = 1,
  limit = 10,
): Promise<{ students: unknown[]; pagination: Record<string, unknown>; expired?: boolean } | null> {
  const client = requireSupabase()
  const { data, error } = await client.rpc('get_public_resume_book_students', {
    p_token: token,
    p_page: page,
    p_limit: limit,
  })
  if (error) throw error
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null
  const payload = data as Record<string, unknown>
  if (payload.expired === true) return { students: [], pagination: {}, expired: true }
  return {
    students: Array.isArray(payload.students) ? payload.students : [],
    pagination: (payload.pagination as Record<string, unknown>) ?? {},
  }
}
