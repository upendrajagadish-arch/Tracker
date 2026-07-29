import { requireSupabase } from '@/lib/supabase'
import { logPlacementAudit } from '@/lib/placementAudit'
import type { StudentProfileRow } from '@/api/placement/students'
import type { Database, Json } from '@/types/supabase'

export type StudentUpdateCampaignRow = Database['public']['Tables']['student_update_campaigns']['Row']
export type StudentUpdateTokenRow = Database['public']['Tables']['student_update_tokens']['Row']

/** Public campaign allowlist — never include staff-only placement fields. */
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
  'linkedin_url',
  'github_url',
  'portfolio_url',
  'skills_summary',
  'career_interest',
  'platform_handles',
  'projects_summary',
  'certifications_summary',
  'resume',
] as const

export interface CampaignRecipientRow extends StudentUpdateTokenRow {
  student?: Pick<
    StudentProfileRow,
    'id' | 'full_name' | 'roll_number' | 'branch' | 'batch' | 'academic_batch' | 'section' | 'email' | 'created_at'
  > | null
}

export interface CampaignRegistrantRow {
  id: string
  full_name: string
  roll_number: string
  branch: string
  batch: string
  academic_batch: string | null
  section: string
  email: string
  phone: string
  date_of_birth: string | null
  cgpa: number | null
  active_backlogs: number
  linkedin_url: string
  github_url: string
  portfolio_url: string
  skills_summary: string
  career_interest: string
  projects_summary: string
  certifications_summary: string
  platform_handles: Record<string, string> | Json
  created_at: string
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
  allowlistedFields?: string[]
}

export interface PublicRegistrationForm {
  /** Resolved campaign UUID used for submit / resume RPCs. */
  campaignId: string
  campaignTitle: string
  campaignDescription: string
  expiresAt: string | null
  allowlistedFields: string[]
  publicLinkToken: string | null
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
    certificationsSummary: string
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

export function campaignSharedUpdateUrl(campaignIdOrPublicToken: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  return `${origin}/student/update/campaign/${campaignIdOrPublicToken}`
}

export function campaignRegistrationUrl(campaignIdOrPublicToken: string): string {
  return campaignSharedUpdateUrl(campaignIdOrPublicToken)
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value.trim(),
  )
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
  const [
    { data: campaigns, error: cErr },
    { data: registrants, error: rErr },
    { data: tokens, error: tErr },
  ] = await Promise.all([
    client.from('student_update_campaigns').select('id,status,expires_at'),
    client.from('student_profiles').select('registered_via_campaign_id').not('registered_via_campaign_id', 'is', null),
    client.from('student_update_tokens').select('id,opened_at,submitted_at,expires_at').limit(5000),
  ])
  if (cErr) throw cErr
  if (rErr) throw rErr

  const tokenRows = tErr ? [] : tokens ?? []
  const now = Date.now()
  const opened = tokenRows.filter((row) => row.opened_at).length
  const completed = tokenRows.filter((row) => row.submitted_at).length
  const expired = tokenRows.filter((row) => {
    if (row.submitted_at) return false
    if (!row.expires_at) return false
    return new Date(row.expires_at).getTime() < now
  }).length
  const pending = Math.max(0, tokenRows.length - completed - expired)
  const registrations = registrants?.length ?? 0

  return {
    campaigns: campaigns?.length ?? 0,
    students: registrations,
    opened: opened || registrations,
    completed: completed || registrations,
    pending,
    expired,
  }
}

export async function listCampaignRegistrants(campaignId: string): Promise<CampaignRegistrantRow[]> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('student_profiles')
    .select(
      'id, full_name, roll_number, branch, batch, academic_batch, section, email, phone, date_of_birth, cgpa, active_backlogs, linkedin_url, github_url, portfolio_url, skills_summary, career_interest, projects_summary, certifications_summary, platform_handles, created_at',
    )
    .eq('registered_via_campaign_id', campaignId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
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
      .select('id, full_name, roll_number, branch, batch, academic_batch, section, email, created_at')
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
  registrationUrl: string
}> {
  if (!input.title.trim()) throw new Error('Campaign title is required.')

  const client = requireSupabase()
  const expiresAt = input.expiresAt || defaultExpiry(14)
  const allowlistedFields = (input.allowlistedFields?.length
    ? input.allowlistedFields
    : [...DEFAULT_CAMPAIGN_ALLOWLIST]
  ).filter((field) => field !== 'placement_status' && field !== 'is_placement_eligible')

  const publicLinkToken = createShareToken()
  const baseInsert = {
    title: input.title.trim(),
    description: input.description?.trim() ?? '',
    status: 'active' as const,
    filters: {} as Json,
    allowlisted_fields: allowlistedFields as unknown as Json,
    expires_at: expiresAt,
  }

  let campaign: StudentUpdateCampaignRow
  {
    const first = await client
      .from('student_update_campaigns')
      .insert({ ...baseInsert, public_link_token: publicLinkToken } as never)
      .select()
      .single()
    if (first.error && /public_link_token|column/i.test(first.error.message)) {
      const fallback = await client.from('student_update_campaigns').insert(baseInsert).select().single()
      if (fallback.error) throw fallback.error
      campaign = fallback.data
    } else if (first.error) {
      throw first.error
    } else {
      campaign = first.data
    }
  }

  const sharePath =
    (campaign as StudentUpdateCampaignRow & { public_link_token?: string | null }).public_link_token ||
    publicLinkToken ||
    campaign.id
  const registrationUrl = campaignRegistrationUrl(
    (campaign as { public_link_token?: string | null }).public_link_token
      ? String((campaign as { public_link_token?: string | null }).public_link_token)
      : campaign.id,
  )

  await logPlacementAudit({
    action: 'campaign.create',
    entityType: 'student_update_campaign',
    entityId: campaign.id,
    description: `Created registration campaign "${campaign.title}"`,
    metadata: { registrationUrl, sharePath },
  })

  return { campaign, registrationUrl }
}

export async function deleteCampaign(campaignId: string): Promise<void> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('student_update_campaigns')
    .delete()
    .eq('id', campaignId)
    .select('id, title')
    .maybeSingle()
  if (error) throw error
  if (!data) throw new Error('Campaign not found or could not be deleted.')

  await logPlacementAudit({
    action: 'campaign.delete',
    entityType: 'student_update_campaign',
    entityId: campaignId,
    description: `Deleted registration campaign "${data.title}"`,
    metadata: { campaignId },
  })
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
      certificationsSummary: String(profile.certificationsSummary ?? ''),
    },
    resumeFileName: (raw.resumeFileName as string | null) ?? null,
  }
}

export async function getPublicCampaignRegistrationForm(
  campaignIdOrToken: string,
): Promise<PublicRegistrationForm | null> {
  const client = requireSupabase()
  const key = campaignIdOrToken.trim()
  let raw: Record<string, unknown> | null = null

  if (isUuid(key)) {
    const { data, error } = await client.rpc('get_public_campaign_registration_form', {
      p_campaign_id: key,
    })
    if (error) throw error
    if (data) {
      raw = data as Record<string, unknown>
      raw.campaignId = key
    }
  }

  if (!raw) {
    const { data, error } = await client.rpc('get_public_campaign_registration_form_by_token', {
      p_token: key,
    })
    if (error) {
      // Function may not exist until hardening SQL is applied — fall through.
      if (!/could not find the function|schema cache|404/i.test(error.message)) throw error
    } else if (data) {
      raw = data as Record<string, unknown>
    }
  }

  if (!raw) return null

  const campaignId = String(raw.campaignId ?? (isUuid(key) ? key : ''))
  if (!campaignId) return null

  return {
    campaignId,
    campaignTitle: String(raw.campaignTitle ?? ''),
    campaignDescription: String(raw.campaignDescription ?? ''),
    expiresAt: (raw.expiresAt as string | null) ?? null,
    allowlistedFields: Array.isArray(raw.allowlistedFields)
      ? (raw.allowlistedFields as string[]).filter(
          (field) => field !== 'placement_status' && field !== 'is_placement_eligible',
        )
      : [...DEFAULT_CAMPAIGN_ALLOWLIST],
    publicLinkToken: raw.publicLinkToken == null ? null : String(raw.publicLinkToken),
  }
}

export async function submitPublicCampaignRegistration(
  campaignId: string,
  payload: Record<string, unknown>,
): Promise<{
  ok: boolean
  error?: string
  studentProfileId?: string
  updated?: boolean
  resumeUploadToken?: string
}> {
  const client = requireSupabase()
  const { data, error } = await client.rpc('submit_public_campaign_registration', {
    p_campaign_id: campaignId,
    p_payload: payload as Json,
  })
  if (error) {
    const message = error.message || 'Registration failed'
    if (/gen_random_bytes|schema cache|could not find the function|42883/i.test(message)) {
      throw new Error(
        'Registration is temporarily unavailable (database needs update). Ask placement staff to apply scripts/apply-campaign-link-hardening.sql in the Supabase SQL Editor.',
      )
    }
    throw error
  }
  const result = (data ?? {}) as {
    ok?: boolean
    error?: string
    studentProfileId?: string
    updated?: boolean
    resumeUploadToken?: string
  }
  return {
    ok: Boolean(result.ok),
    error: result.error,
    studentProfileId: result.studentProfileId,
    updated: Boolean(result.updated),
    resumeUploadToken: result.resumeUploadToken,
  }
}

export async function uploadPublicCampaignRegistrationResume(
  campaignId: string,
  studentProfileId: string,
  file: File,
  resumeUploadToken: string,
): Promise<void> {
  const client = requireSupabase()
  if (!resumeUploadToken || resumeUploadToken.length < 32) {
    throw new Error(
      'Resume upload session expired. Submit the registration form again, then upload the resume.',
    )
  }
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const lowerName = file.name.toLowerCase()
  const guessedMime =
    file.type ||
    (lowerName.endsWith('.docx')
      ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      : lowerName.endsWith('.doc')
        ? 'application/msword'
        : 'application/pdf')
  const allowedMimes = new Set([
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ])
  if (!allowedMimes.has(guessedMime)) {
    throw new Error('Only PDF, DOC, or DOCX resumes are allowed.')
  }
  if (!Number.isFinite(file.size) || file.size <= 0 || file.size > 10 * 1024 * 1024) {
    throw new Error('Resume file must be between 1 byte and 10 MB.')
  }
  const metadata = { mimetype: guessedMime, size: String(file.size) }
  const storagePath = `campaign-reg/${campaignId}/${studentProfileId}/${Date.now()}-${safeName}`
  const { error: uploadError } = await client.storage.from('resumes').upload(storagePath, file, {
    contentType: guessedMime,
    upsert: false,
    metadata,
  })
  if (uploadError) {
    throw new Error(`Resume upload failed. ${uploadError.message}`)
  }

  const { data, error } = await client.rpc('register_public_campaign_registration_resume', {
    p_campaign_id: campaignId,
    p_student_profile_id: studentProfileId,
    p_file_name: file.name,
    p_storage_path: storagePath,
    p_mime_type: guessedMime,
    p_file_size: file.size,
    p_upload_token: resumeUploadToken,
  })
  if (error) {
    try {
      await client.storage.from('resumes').remove([storagePath])
    } catch {
      // best-effort cleanup of orphan object
    }
    throw new Error(error.message || 'Campaign resume registration failed')
  }
  const result = (data ?? {}) as { ok?: boolean; error?: string }
  if (!result.ok) {
    try {
      await client.storage.from('resumes').remove([storagePath])
    } catch {
      // best-effort cleanup
    }
    throw new Error(result.error || 'Failed to register resume')
  }
}

/** @deprecated Dangerous if granted to anon; keep revoked. Prefer staff-issued update tokens. */
export async function resolveCampaignStudentToken(
  campaignId: string,
  rollNumber: string,
): Promise<string | null> {
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
  const sanitized = { ...payload }
  delete sanitized.placementStatus
  delete sanitized.placement_status
  delete sanitized.isPlacementEligible
  delete sanitized.is_placement_eligible
  const { data, error } = await client.rpc('submit_public_student_update', {
    p_token: token,
    p_payload: sanitized as Json,
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
  const lowerName = file.name.toLowerCase()
  const guessedMime =
    file.type ||
    (lowerName.endsWith('.docx')
      ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      : lowerName.endsWith('.doc')
        ? 'application/msword'
        : 'application/pdf')
  const allowedMimes = new Set([
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ])
  if (!allowedMimes.has(guessedMime)) {
    throw new Error('Only PDF, DOC, or DOCX resumes are allowed.')
  }
  if (!Number.isFinite(file.size) || file.size <= 0 || file.size > 10 * 1024 * 1024) {
    throw new Error('Resume file must be between 1 byte and 10 MB.')
  }
  const storagePath = `campaign/${token}/${Date.now()}-${safeName}`

  const { error: uploadError } = await client.storage.from('resumes').upload(storagePath, file, {
    contentType: guessedMime,
    upsert: false,
    metadata: { mimetype: guessedMime, size: String(file.size) },
  })
  if (uploadError) throw uploadError

  const { data, error } = await client.rpc('register_public_campaign_resume', {
    p_token: token,
    p_file_name: file.name,
    p_storage_path: storagePath,
    p_mime_type: guessedMime,
    p_file_size: file.size,
  })
  if (error) throw error
  const result = (data ?? {}) as { ok?: boolean; error?: string }
  if (!result.ok) throw new Error(result.error || 'Failed to register resume')
}
