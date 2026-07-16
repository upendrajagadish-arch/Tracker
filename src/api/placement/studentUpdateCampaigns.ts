import { requireSupabase } from '@/lib/supabase'
import { logPlacementAudit } from '@/lib/placementAudit'
import { listStudents, type StudentListFilters, type StudentProfileRow } from '@/api/placement/students'
import type { Database, Json } from '@/types/supabase'

export type StudentUpdateCampaignRow = Database['public']['Tables']['student_update_campaigns']['Row']
export type StudentUpdateTokenRow = Database['public']['Tables']['student_update_tokens']['Row']

/** Same profile fields as the staff edit-student form. */
export const DEFAULT_CAMPAIGN_ALLOWLIST = [
  'roll_number',
  'full_name',
  'email',
  'phone',
  'branch',
  'batch',
  'academic_batch',
  'date_of_birth',
  'cgpa',
  'active_backlogs',
  'placement_status',
  'is_placement_eligible',
  'linkedin_url',
  'github_url',
  'portfolio_url',
  'skills_summary',
  'career_interest',
  'platform_handles',
  'projects_summary',
] as const

export interface CampaignRecipientRow extends StudentUpdateTokenRow {
  student?: Pick<
    StudentProfileRow,
    'id' | 'full_name' | 'roll_number' | 'branch' | 'batch' | 'academic_batch' | 'section'
  > | null
}

export interface CampaignSummary {
  campaigns: number
  students: number
  opened: number
  completed: number
  pending: number
  expired: number
}

export interface CreateCampaignInput {
  title: string
  description?: string
  expiresAt?: string | null
  filters?: StudentListFilters
  allowlistedFields?: string[]
  studentIds?: string[]
}

export interface PublicUpdateForm {
  campaignTitle: string
  campaignDescription: string
  expiresAt: string | null
  allowlistedFields: string[]
  submittedAt: string | null
  editable: {
    rollNumber: string
    fullName: string
    email: string
    phone: string
    branch: string
    batch: string
    dateOfBirth: string | null
    cgpa: number | null
    activeBacklogs: number
    placementStatus: string
    isPlacementEligible: boolean
    linkedinUrl: string
    githubUrl: string
    portfolioUrl: string
    skillsSummary: string
    careerInterest: string
    platformHandles: Record<string, string>
    projectsSummary: string
  }
  resumeFileName: string | null
}

function createShareToken(): string {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

function defaultExpiry(days = 14): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

export function campaignUpdateUrl(token: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  return `${origin}/student/update/${token}`
}

export function campaignSharedUpdateUrl(campaignId: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  return `${origin}/student/update/campaign/${campaignId}`
}

export async function listCampaigns(): Promise<StudentUpdateCampaignRow[]> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('student_update_campaigns')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getCampaign(campaignId: string): Promise<StudentUpdateCampaignRow | null> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('student_update_campaigns')
    .select('*')
    .eq('id', campaignId)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function getCampaignSummary(): Promise<CampaignSummary> {
  const client = requireSupabase()
  const [{ data: campaigns, error: cErr }, { data: tokens, error: tErr }] = await Promise.all([
    client.from('student_update_campaigns').select('id'),
    client.from('student_update_tokens').select('opened_at, submitted_at, expires_at, is_active, revoked_at'),
  ])
  if (cErr) throw cErr
  if (tErr) throw tErr

  const now = Date.now()
  let opened = 0
  let completed = 0
  let pending = 0
  let expired = 0
  for (const token of tokens ?? []) {
    const isExpired = Boolean(token.revoked_at) || !token.is_active || new Date(token.expires_at).getTime() <= now
    if (isExpired) {
      expired += 1
      continue
    }
    if (token.submitted_at) completed += 1
    else if (token.opened_at) {
      opened += 1
      pending += 1
    } else pending += 1
  }

  return {
    campaigns: campaigns?.length ?? 0,
    students: tokens?.length ?? 0,
    opened,
    completed,
    pending,
    expired,
  }
}

export async function listCampaignRecipients(campaignId: string): Promise<CampaignRecipientRow[]> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('student_update_tokens')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false })
  if (error) throw error

  const tokens = data ?? []
  const studentIds = [...new Set(tokens.map((t) => t.student_profile_id))]
  const students = new Map<string, CampaignRecipientRow['student']>()
  if (studentIds.length) {
    const { data: rows, error: sErr } = await client
      .from('student_profiles')
      .select('id, full_name, roll_number, branch, batch, academic_batch, section')
      .in('id', studentIds)
    if (sErr) throw sErr
    for (const row of rows ?? []) students.set(row.id, row)
  }

  return tokens.map((token) => ({
    ...token,
    student: students.get(token.student_profile_id) ?? null,
  }))
}

export async function createCampaignWithTokens(input: CreateCampaignInput): Promise<{
  campaign: StudentUpdateCampaignRow
  tokenCount: number
}> {
  if (!input.title.trim()) throw new Error('Campaign title is required.')

  const client = requireSupabase()
  const expiresAt = input.expiresAt || defaultExpiry(14)
  const filters = input.filters ?? {}
  const allowlistedFields = input.allowlistedFields?.length
    ? input.allowlistedFields
    : [...DEFAULT_CAMPAIGN_ALLOWLIST]

  // Resolve recipients
  let studentIds = input.studentIds ?? []
  if (!studentIds.length) {
    const pageLimit = 100
    let page = 1
    const all: string[] = []
    for (;;) {
      const result = await listStudents({
        ...filters,
        studentIds: undefined,
        page,
        limit: pageLimit,
      })
      all.push(...result.data.map((s) => s.id))
      if (page >= result.pagination.pages || !result.data.length) break
      page += 1
      if (all.length >= 2000) break
    }
    studentIds = all
  }

  if (!studentIds.length) throw new Error('No active students found to create campaign links.')

  const { data: campaign, error } = await client
    .from('student_update_campaigns')
    .insert({
      title: input.title.trim(),
      description: input.description?.trim() ?? '',
      status: 'active',
      filters: filters as Json,
      allowlisted_fields: allowlistedFields as unknown as Json,
      expires_at: expiresAt,
    })
    .select()
    .single()
  if (error) throw error

  const tokenRows = studentIds.map((studentId) => ({
    campaign_id: campaign.id,
    student_profile_id: studentId,
    token: createShareToken(),
    expires_at: expiresAt,
    is_active: true,
  }))

  // Insert in chunks
  for (let i = 0; i < tokenRows.length; i += 200) {
    const chunk = tokenRows.slice(i, i + 200)
    const { error: tokenError } = await client.from('student_update_tokens').insert(chunk)
    if (tokenError) throw tokenError
  }

  await logPlacementAudit({
    action: 'campaign.create',
    entityType: 'student_update_campaign',
    entityId: campaign.id,
    description: `Created update campaign "${campaign.title}" with ${tokenRows.length} links`,
    metadata: { tokenCount: tokenRows.length, filters },
  })

  await logPlacementAudit({
    action: 'campaign.tokens.issue',
    entityType: 'student_update_campaign',
    entityId: campaign.id,
    description: `Issued ${tokenRows.length} update tokens`,
    metadata: { tokenCount: tokenRows.length },
  })

  return { campaign, tokenCount: tokenRows.length }
}

export async function disableCampaignToken(tokenId: string): Promise<void> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('student_update_tokens')
    .update({ is_active: false, revoked_at: new Date().toISOString() })
    .eq('id', tokenId)
    .select()
    .single()
  if (error) throw error
  await logPlacementAudit({
    action: 'campaign.token.disable',
    entityType: 'student_update_token',
    entityId: tokenId,
    description: 'Disabled student update link',
    metadata: { campaignId: data.campaign_id, studentProfileId: data.student_profile_id },
  })
}

export async function extendCampaignToken(tokenId: string, days = 14): Promise<StudentUpdateTokenRow> {
  const client = requireSupabase()
  const next = new Date()
  next.setDate(next.getDate() + days)
  const { data, error } = await client
    .from('student_update_tokens')
    .update({
      expires_at: next.toISOString(),
      is_active: true,
      revoked_at: null,
    })
    .eq('id', tokenId)
    .select()
    .single()
  if (error) throw error
  await logPlacementAudit({
    action: 'campaign.token.extend',
    entityType: 'student_update_token',
    entityId: tokenId,
    description: `Extended update link by ${days} days`,
    metadata: { expiresAt: data.expires_at },
  })
  return data
}

export async function regenerateCampaignToken(tokenId: string): Promise<StudentUpdateTokenRow> {
  const client = requireSupabase()
  const token = createShareToken()
  const { data, error } = await client
    .from('student_update_tokens')
    .update({
      token,
      is_active: true,
      revoked_at: null,
      opened_at: null,
      submitted_at: null,
      last_activity_at: null,
    })
    .eq('id', tokenId)
    .select()
    .single()
  if (error) throw error
  await logPlacementAudit({
    action: 'campaign.token.regenerate',
    entityType: 'student_update_token',
    entityId: tokenId,
    description: 'Regenerated student update link',
    metadata: { campaignId: data.campaign_id },
  })
  return data
}

export async function getPublicStudentUpdateForm(token: string): Promise<PublicUpdateForm | null> {
  const client = requireSupabase()
  const { data, error } = await client.rpc('get_public_student_update_form', { p_token: token })
  if (error) throw error
  if (!data) return null
  const raw = data as Record<string, unknown>
  const locked = (raw.locked ?? {}) as Record<string, unknown>
  const editable = (raw.editable ?? {}) as Record<string, unknown>
  // New RPC puts all fields in editable; legacy responses split locked + editable.
  const profile = { ...locked, ...editable }

  return {
    campaignTitle: String(raw.campaignTitle ?? ''),
    campaignDescription: String(raw.campaignDescription ?? ''),
    expiresAt: (raw.expiresAt as string | null) ?? null,
    allowlistedFields: Array.isArray(raw.allowlistedFields)
      ? (raw.allowlistedFields as string[])
      : [...DEFAULT_CAMPAIGN_ALLOWLIST],
    submittedAt: (raw.submittedAt as string | null) ?? null,
    editable: {
      rollNumber: String(profile.rollNumber ?? ''),
      fullName: String(profile.fullName ?? ''),
      email: String(profile.email ?? ''),
      phone: String(profile.phone ?? ''),
      branch: String(profile.branch ?? ''),
      batch: String(profile.batch ?? profile.academicBatch ?? ''),
      dateOfBirth: (profile.dateOfBirth as string | null) ?? null,
      cgpa: profile.cgpa == null || profile.cgpa === '' ? null : Number(profile.cgpa),
      activeBacklogs: Number(profile.activeBacklogs ?? 0),
      placementStatus: String(profile.placementStatus ?? 'NOT_STARTED'),
      isPlacementEligible: profile.isPlacementEligible !== false,
      linkedinUrl: String(profile.linkedinUrl ?? ''),
      githubUrl: String(profile.githubUrl ?? ''),
      portfolioUrl: String(profile.portfolioUrl ?? ''),
      skillsSummary: String(profile.skillsSummary ?? ''),
      careerInterest: String(profile.careerInterest ?? ''),
      platformHandles: (profile.platformHandles as Record<string, string>) ?? {},
      projectsSummary: String(profile.projectsSummary ?? ''),
    },
    resumeFileName: (raw.resumeFileName as string | null) ?? null,
  }
}

export async function resolveCampaignStudentToken(campaignId: string, rollNumber: string): Promise<string | null> {
  const client = requireSupabase()
  const { data, error } = await client.rpc('resolve_public_campaign_student_token', {
    p_campaign_id: campaignId,
    p_roll_number: rollNumber.trim(),
  })
  if (error) throw error
  if (!data) return null
  return String(data)
}

export async function submitPublicStudentUpdate(
  token: string,
  payload: Record<string, unknown>,
): Promise<{ ok: boolean; error?: string; updatedFields?: string[] }> {
  const client = requireSupabase()
  const { data, error } = await client.rpc('submit_public_student_update', {
    p_token: token,
    p_payload: payload as Json,
  })
  if (error) throw error
  const result = (data ?? {}) as { ok?: boolean; error?: string; updatedFields?: string[] }
  return {
    ok: Boolean(result.ok),
    error: result.error,
    updatedFields: result.updatedFields,
  }
}

export async function uploadPublicCampaignResume(token: string, file: File): Promise<void> {
  const client = requireSupabase()
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const storagePath = `campaign/${token}/${Date.now()}-${safeName}`

  const { error: uploadError } = await client.storage.from('resumes').upload(storagePath, file, {
    contentType: file.type || 'application/pdf',
    upsert: false,
  })
  if (uploadError) throw uploadError

  const { data, error } = await client.rpc('register_public_campaign_resume', {
    p_token: token,
    p_file_name: file.name,
    p_storage_path: storagePath,
    p_mime_type: file.type || 'application/pdf',
    p_file_size: file.size,
  })
  if (error) throw error
  const result = (data ?? {}) as { ok?: boolean; error?: string }
  if (!result.ok) throw new Error(result.error || 'Failed to register resume')
}
