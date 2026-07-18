import { requireSupabase } from '@/lib/supabase'
import { logPlacementAudit } from '@/lib/placementAudit'
import type { Database } from '@/types/supabase'

export type StudentResumeRow = Database['public']['Tables']['student_resumes']['Row']

const RESUME_BUCKET = 'resumes'

export interface ResumeListFilters {
  studentProfileId?: string
  reviewStatus?: string
  page?: number
  limit?: number
}

export interface PaginatedResumes {
  data: StudentResumeRow[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export interface UploadResumeInput {
  studentProfileId: string
  file: File
  userId?: string | null
}

export interface UpdateReviewStatusInput {
  reviewStatus: 'pending' | 'approved' | 'rejected' | 'needs_revision'
  reviewerComments?: string
  resumeScore?: number
  atsFriendly?: boolean
}

function normalizePagination(page = 1, limit = 20) {
  const safePage = Math.max(1, page)
  const safeLimit = Math.min(Math.max(1, limit), 100)
  return { page: safePage, limit: safeLimit, from: (safePage - 1) * safeLimit, to: safePage * safeLimit - 1 }
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_')
}

export async function listResumes(filters: ResumeListFilters = {}): Promise<PaginatedResumes> {
  const client = requireSupabase()
  const { page, limit, from, to } = normalizePagination(filters.page, filters.limit)

  let query = client
    .from('student_resumes')
    .select('*', { count: 'exact' })
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (filters.studentProfileId) query = query.eq('student_profile_id', filters.studentProfileId)
  if (filters.reviewStatus) query = query.eq('review_status', filters.reviewStatus)

  const { data, error, count } = await query.range(from, to)
  if (error) throw error
  const total = count ?? 0
  return {
    data: data ?? [],
    pagination: { page, limit, total, pages: total ? Math.ceil(total / limit) : 0 },
  }
}

export async function uploadResume(input: UploadResumeInput): Promise<StudentResumeRow> {
  const client = requireSupabase()
  const safeName = sanitizeFileName(input.file.name)
  const storagePath = `${input.studentProfileId}/${Date.now()}-${safeName}`
  const { data: previousActive, error: previousError } = await client
    .from('student_resumes')
    .select('id')
    .eq('student_profile_id', input.studentProfileId)
    .eq('is_active', true)
  if (previousError) throw previousError

  const { error: uploadError } = await client.storage
    .from(RESUME_BUCKET)
    .upload(storagePath, input.file, {
      contentType: input.file.type || 'application/pdf',
      upsert: false,
    })
  if (uploadError) throw uploadError

  const { error: deactivateError } = await client
    .from('student_resumes')
    .update({ is_active: false })
    .eq('student_profile_id', input.studentProfileId)
    .eq('is_active', true)
  if (deactivateError) {
    await client.storage.from(RESUME_BUCKET).remove([storagePath])
    throw deactivateError
  }

  const { data, error } = await client
    .from('student_resumes')
    .insert({
      student_profile_id: input.studentProfileId,
      user_id: input.userId ?? null,
      file_name: input.file.name,
      storage_path: storagePath,
      mime_type: input.file.type || 'application/pdf',
      file_size: input.file.size,
      is_active: true,
      review_status: 'pending',
    })
    .select()
    .single()
  if (error) {
    await Promise.all([
      client.storage.from(RESUME_BUCKET).remove([storagePath]),
      previousActive?.length
        ? client
            .from('student_resumes')
            .update({ is_active: true })
            .in('id', previousActive.map((resume) => resume.id))
        : Promise.resolve(),
    ])
    throw error
  }

  await logPlacementAudit({
    action: 'resume.upload',
    entityType: 'student_resume',
    entityId: data.id,
    description: `Uploaded resume ${data.file_name}`,
    metadata: { studentProfileId: input.studentProfileId, storagePath },
  })

  return data
}

export async function updateReviewStatus(resumeId: string, input: UpdateReviewStatusInput): Promise<StudentResumeRow> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('student_resumes')
    .update({
      review_status: input.reviewStatus,
      reviewer_comments: input.reviewerComments ?? '',
      resume_score: input.resumeScore,
      ats_friendly: input.atsFriendly,
    })
    .eq('id', resumeId)
    .select()
    .single()
  if (error) throw error

  await logPlacementAudit({
    action: 'resume.review',
    entityType: 'student_resume',
    entityId: data.id,
    description: `Resume review set to ${input.reviewStatus}`,
    metadata: { reviewStatus: input.reviewStatus },
  })

  return data
}

export async function getResumeDownloadUrl(resumeId: string, expiresInSeconds = 3600): Promise<string> {
  const client = requireSupabase()
  const { data: resume, error } = await client
    .from('student_resumes')
    .select('storage_path')
    .eq('id', resumeId)
    .single()
  if (error) throw error

  const { data, error: urlError } = await client.storage
    .from(RESUME_BUCKET)
    .createSignedUrl(resume.storage_path, expiresInSeconds)
  if (urlError) throw urlError
  if (!data?.signedUrl) throw new Error('Could not create resume download URL.')
  return data.signedUrl
}

export async function getActiveResume(studentProfileId: string): Promise<StudentResumeRow | null> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('student_resumes')
    .select('*')
    .eq('student_profile_id', studentProfileId)
    .eq('is_active', true)
    .maybeSingle()
  if (error) throw error
  return data
}
