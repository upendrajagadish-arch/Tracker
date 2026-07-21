import { requireSupabase } from '@/lib/supabase'
import type { Database, Json } from '@/types/supabase'

export type PlacementDriveLinkRow = Database['public']['Tables']['placement_drive_links']['Row']
export type PlacementDriveRegistrationRow =
  Database['public']['Tables']['placement_drive_registrations']['Row']

export interface PublicDriveRegistrationForm {
  companyName: string
  driveTitle: string
  startsAt: string
  venue: string
  mode: string
  registrationClosesAt: string | null
  placementEventId: string
}

export interface DriveRegistrationPayload {
  fullName: string
  rollNumber: string
  email: string
  mobile: string
  tenthPercentage: number
  twelfthPercentage: number
  btechCgpa: number
  activeBacklogs: number
  resumeUrl: string
}

export function companyDriveRegistrationUrl(token: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  return `${origin}/student/drive/${token}`
}

export async function scheduleCompanyDriveWithRegistration(input: {
  title: string
  companyId: string
  startsAt: string
  registrationClosesAt?: string | null
  venue?: string
  mode?: string
  audienceBatches?: string[]
}): Promise<{
  event: Database['public']['Tables']['placement_events']['Row']
  driveLinkId: string
  token: string
  companyName: string
  label: string
  registrationUrl: string
}> {
  const client = requireSupabase()
  const { data, error } = await client.rpc('schedule_company_drive_with_registration', {
    p_title: input.title,
    p_company_id: input.companyId,
    p_starts_at: input.startsAt,
    p_registration_closes_at: input.registrationClosesAt ?? null,
    p_venue: input.venue ?? '',
    p_mode: input.mode ?? 'on_campus',
    p_audience_batches: input.audienceBatches ?? [],
  })
  if (error) throw error
  const raw = (data ?? {}) as Record<string, unknown>
  const token = String(raw.token ?? '')
  if (!token) throw new Error('Drive link token was not returned.')
  return {
    event: raw.event as Database['public']['Tables']['placement_events']['Row'],
    driveLinkId: String(raw.driveLinkId ?? ''),
    token,
    companyName: String(raw.companyName ?? ''),
    label: String(raw.label ?? ''),
    registrationUrl: companyDriveRegistrationUrl(token),
  }
}

export async function listPlacementDriveLinks(): Promise<PlacementDriveLinkRow[]> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('placement_drive_links')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function listDriveRegistrations(
  placementEventId: string,
): Promise<PlacementDriveRegistrationRow[]> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('placement_drive_registrations')
    .select('*')
    .eq('placement_event_id', placementEventId)
    .order('submitted_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function countDriveRegistrationsByEvent(): Promise<Record<string, number>> {
  const client = requireSupabase()
  const { data, error } = await client.from('placement_drive_registrations').select('placement_event_id')
  if (error) throw error
  const counts: Record<string, number> = {}
  for (const row of data ?? []) {
    counts[row.placement_event_id] = (counts[row.placement_event_id] ?? 0) + 1
  }
  return counts
}

export async function getPublicDriveRegistrationForm(
  token: string,
): Promise<PublicDriveRegistrationForm | null> {
  const client = requireSupabase()
  const { data, error } = await client.rpc('get_public_drive_registration_form', { p_token: token })
  if (error) throw error
  if (!data) return null
  const raw = data as Record<string, unknown>
  return {
    companyName: String(raw.companyName ?? ''),
    driveTitle: String(raw.driveTitle ?? ''),
    startsAt: String(raw.startsAt ?? ''),
    venue: String(raw.venue ?? ''),
    mode: String(raw.mode ?? ''),
    registrationClosesAt: raw.registrationClosesAt == null ? null : String(raw.registrationClosesAt),
    placementEventId: String(raw.placementEventId ?? ''),
  }
}

export async function submitPublicDriveRegistration(
  token: string,
  payload: DriveRegistrationPayload,
): Promise<{ ok: boolean; error?: string; registrationId?: string }> {
  const client = requireSupabase()
  const { data, error } = await client.rpc('submit_public_drive_registration', {
    p_token: token,
    p_payload: payload as unknown as Json,
  })
  if (error) throw error
  const result = (data ?? {}) as { ok?: boolean; error?: string; registrationId?: string }
  return {
    ok: Boolean(result.ok),
    error: result.error,
    registrationId: result.registrationId,
  }
}

export function driveRegistrationsExportSection(
  companyName: string,
  driveTitle: string,
  rows: PlacementDriveRegistrationRow[],
) {
  const columns = [
    'Company',
    'Drive',
    'Submitted at',
    'Full name',
    'Roll number',
    'Email',
    'Mobile',
    '10th %',
    '12th %',
    'B.Tech CGPA',
    'Active backlogs',
    'Resume URL',
  ]
  const displayRows = rows.map((row) => [
    companyName,
    driveTitle,
    new Date(row.submitted_at).toLocaleString(),
    row.full_name,
    row.roll_number,
    row.email,
    row.mobile,
    row.tenth_percentage == null ? '' : String(row.tenth_percentage),
    row.twelfth_percentage == null ? '' : String(row.twelfth_percentage),
    row.btech_cgpa == null ? '' : String(row.btech_cgpa),
    String(row.active_backlogs),
    row.resume_url,
  ])
  return {
    title: `${companyName} — Registrations`,
    description: `Drive: ${driveTitle}`,
    fileBase: `${companyName}_${driveTitle}_registrations`.replace(/[^\w-]+/g, '_'),
    sheetName: 'Registrations',
    columns,
    rows: displayRows,
    excelRows: displayRows,
  }
}
