import { requireSupabase } from '@/lib/supabase'
import {
  classifyCommunicationBadge,
  totalScoreFromPercentage,
  type CommunicationBadge,
} from '@/lib/communicationBadge'
import {
  classifyTechStackBadge,
  computeTechStackScore,
  emptyBadgeCounts,
  tallyBadge,
  type BadgeCountMap,
  type TechStackBadge,
} from '@/lib/techStackBadge'
import type { Database, PlacementRole } from '@/types/supabase'

export type PlacementEventRow = Database['public']['Tables']['placement_events']['Row']
export type CompanyShareLinkRow = Database['public']['Tables']['company_share_links']['Row']
export type PlacementNotificationRow =
  Database['public']['Tables']['placement_notifications']['Row']

export interface DashboardSnapshot {
  batch: string
  availableBatches: string[]
  refreshedAt: string
  overview: {
    totalStudents: number
    above60: number
    above70: number
    above80: number
    placed: number
    unplaced: number
    placementPercentage: number
    placementProgress: number
    readinessDistribution: number[]
  }
  management: {
    companyLinks: number
    onCampusCompanies: number
    activeCompanies: number
    upcomingDrives: number
  }
  techReadiness: Array<{ name: string; score: number; students: number; studentIds: string[] }>
  communication: {
    score: number
    confidence: number
    presentation: number
    groupDiscussion: number
    hrReadiness: number
  }
  overall: {
    tech: number
    communication: number
    score: number
    recommendation: string
  }
  upcomingEvents: PlacementEventRow[]
  activities: Array<{
    id: string
    action: string
    description: string
    createdAt: string
  }>
  leaderboard: Array<{
    rank: number
    fullName: string
    rollNumber: string
    fameXp: number
  }>
  studentDetails: Array<{
    id: string
    fullName: string
    rollNumber: string
    branch: string
    readinessScore: number
    placementStatus: string
  }>
  communicationParameters: Array<{
    key: string
    label: string
    category: string
    average: number
  }>
  communicationStudents: Array<{
    id: string
    fullName: string
    rollNumber: string
    percentage: number
    totalScore: number
    grade: string
    parameters: Record<string, number>
  }>
  companyLinkDetails: Array<{
    id: string
    label: string
    url: string
    batches: string[]
  }>
  skillBadges: {
    tech: BadgeCountMap
    communication: BadgeCountMap
    techTotal: number
    communicationTotal: number
    byYear: Array<{
      year: string
      tech: BadgeCountMap
      communication: BadgeCountMap
      techAvg: number
      communicationAvg: number
      studentCount: number
    }>
  }
}

const TECH_GROUPS: Array<{ name: string; keys: string[] }> = [
  { name: 'Java', keys: ['java'] },
  { name: 'Python', keys: ['python'] },
  { name: 'MERN', keys: ['mern', 'react', 'node', 'mongodb', 'express'] },
  { name: '.NET', keys: ['.net', 'dotnet', 'c#', 'asp.net'] },
  { name: 'AI/ML', keys: ['ai', 'ml', 'machine learning', 'artificial intelligence'] },
  { name: 'Data Science', keys: ['data science', 'data analytics', 'pandas', 'numpy'] },
  { name: 'Cloud', keys: ['cloud', 'aws', 'azure', 'gcp'] },
]

function average(values: Array<number | null | undefined>): number {
  const valid = values.map(Number).filter((value) => Number.isFinite(value))
  if (!valid.length) return 0
  return Math.round(valid.reduce((sum, value) => sum + value, 0) / valid.length)
}

export function dashboardRecommendation(tech: number, communication: number): string {
  const gap = tech - communication
  if (gap >= 8) {
    return 'Students are technically strong but require focused communication practice before placement interviews.'
  }
  if (gap <= -8) {
    return 'Students communicate confidently; strengthen technical depth through role-based labs and mock assessments.'
  }
  if (Math.min(tech, communication) < 60) {
    return 'Readiness is balanced but below target. Prioritize structured technical and communication training together.'
  }
  return 'The cohort is balanced across technical and communication readiness. Continue interview simulations and advanced role preparation.'
}

export function resolveStudentGraduationBatch(student: {
  graduation_year: number | null
  academic_batch: string | null
  batch: string
}): string {
  if (student.graduation_year) return String(student.graduation_year)
  const academicEnd = student.academic_batch?.match(/(\d{4})\s*$/)?.[1]
  if (academicEnd) return academicEnd
  const batchEnd = student.batch?.match(/(\d{4})\s*$/)?.[1]
  return batchEnd || student.batch || 'Unassigned'
}

export function placementEligibilityCounts(readiness: number[]) {
  return {
    above60: readiness.filter((score) => score >= 60).length,
    above70: readiness.filter((score) => score >= 70).length,
    above80: readiness.filter((score) => score >= 80).length,
  }
}

export function placementPercentage(placed: number, total: number) {
  return total > 0 ? Math.round((placed / total) * 100) : 0
}

export function canManagePlacementOperations(role: PlacementRole | null | undefined) {
  return role === 'admin' || role === 'tpo'
}

function scoreFromLevel(level: string): number {
  const normalized = level.toUpperCase()
  if (normalized === 'ADVANCED') return 100
  if (normalized === 'INTERMEDIATE') return 72
  return 42
}

async function optionalRows<T>(
  query: PromiseLike<{ data: T[] | null; error: { message?: string } | null }>,
): Promise<T[]> {
  const { data, error } = await query
  if (error) throw new Error(error.message || 'Dashboard query failed')
  return data ?? []
}

type DashboardStudentRow = Pick<
  Database['public']['Tables']['student_profiles']['Row'],
  | 'id'
  | 'full_name'
  | 'roll_number'
  | 'branch'
  | 'batch'
  | 'academic_batch'
  | 'graduation_year'
  | 'placement_status'
  | 'readiness_score'
  | 'is_active'
>

async function listAllDashboardStudents(): Promise<DashboardStudentRow[]> {
  const client = requireSupabase()
  const rows: DashboardStudentRow[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await client
      .from('student_profiles')
      .select(
        'id,full_name,roll_number,branch,batch,academic_batch,graduation_year,placement_status,readiness_score,is_active',
      )
      .eq('is_active', true)
      .order('id')
      .range(from, from + 999)
    if (error) throw error
    rows.push(...(data ?? []))
    if (!data || data.length < 1000) return rows
  }
}

async function listAllDashboardTechRows() {
  const client = requireSupabase()
  const rows: Array<{
    student_profile_id: string
    tech_skill_id: string
    proficiency_level: string
  }> = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await client
      .from('student_tech_skills')
      .select('student_profile_id,tech_skill_id,proficiency_level')
      .order('id')
      .range(from, from + 999)
    if (error) throw error
    rows.push(...(data ?? []))
    if (!data || data.length < 1000) return rows
  }
}

/** All 25 communication evaluation criteria (each scored 0–10), grouped by rubric section. */
export const COMMUNICATION_PARAMETERS = [
  { key: 'open_body_posture_smile', label: 'Open Posture & Smile', category: 'Communication Proficiency' },
  { key: 'gestures_eye_contact', label: 'Gestures & Eye Contact', category: 'Communication Proficiency' },
  { key: 'fluency_in_english', label: 'English Fluency', category: 'Communication Proficiency' },
  { key: 'rate_of_speech', label: 'Rate of Speech', category: 'Communication Proficiency' },
  { key: 'pronunciation_clarity', label: 'Pronunciation', category: 'Communication Proficiency' },
  { key: 'voice_modulation', label: 'Voice Modulation', category: 'Communication Proficiency' },
  { key: 'listening_skills', label: 'Listening Skills', category: 'Communication Proficiency' },
  { key: 'body_language', label: 'Body Language', category: 'Communication Proficiency' },
  { key: 'explanation_skills', label: 'Explanation Skills', category: 'Presentation Skills' },
  { key: 'energy_enthusiasm', label: 'Energy & Enthusiasm', category: 'Presentation Skills' },
  { key: 'content_quality_ideas', label: 'Content Quality', category: 'Presentation Skills' },
  { key: 'subject_knowledge', label: 'Subject Knowledge', category: 'Presentation Skills' },
  { key: 'thought_process_creativity', label: 'Creativity', category: 'Presentation Skills' },
  { key: 'audience_orientation', label: 'Audience Orientation', category: 'Presentation Skills' },
  { key: 'courtesy_politeness', label: 'Courtesy', category: 'Behavioural Skills' },
  { key: 'grooming', label: 'Grooming', category: 'Behavioural Skills' },
  { key: 'confidence', label: 'Confidence', category: 'Behavioural Skills' },
  { key: 'professionalism', label: 'Professionalism', category: 'Behavioural Skills' },
  { key: 'initiative', label: 'Initiative', category: 'Behavioural Skills' },
  { key: 'leadership_skills', label: 'Leadership', category: 'Behavioural Skills' },
  { key: 'teamwork', label: 'Teamwork', category: 'Behavioural Skills' },
  { key: 'analytical_critical_thinking', label: 'Analytical Thinking', category: 'Behavioural Skills' },
  { key: 'problem_solving_ability', label: 'Problem Solving', category: 'Behavioural Skills' },
  { key: 'persuasiveness', label: 'Persuasiveness', category: 'Behavioural Skills' },
  { key: 'time_management', label: 'Time Management', category: 'Behavioural Skills' },
] as const

export type CommunicationParameterKey = (typeof COMMUNICATION_PARAMETERS)[number]['key']

type CommunicationEvaluationRow = {
  student_profile_id: string
  percentage: number
  total_score: number
  grade: string
  evaluation_date: string
  presentation_skills_total: number
} & Record<CommunicationParameterKey, number>

async function listAllDashboardCommunicationRows() {
  const client = requireSupabase()
  const parameterColumns = COMMUNICATION_PARAMETERS.map((param) => param.key).join(',')
  const rows: CommunicationEvaluationRow[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await client
      .from('communication_evaluations')
      .select(
        `student_profile_id,percentage,total_score,grade,evaluation_date,presentation_skills_total,${parameterColumns}`,
      )
      .eq('is_active', true)
      .order('evaluation_date', { ascending: false })
      .range(from, from + 999)
    if (error) throw error
    rows.push(...((data ?? []) as unknown as CommunicationEvaluationRow[]))
    if (!data || data.length < 1000) return rows
  }
}

export async function getPremiumDashboard(batch = 'all'): Promise<DashboardSnapshot> {
  const client = requireSupabase()
  const requestedAt = new Date().toISOString()

  const [
    allStudents,
    techRows,
    techCatalog,
    communicationRows,
    events,
    links,
    companies,
    activities,
    leaderboardResult,
    dashboardAggregateResult,
  ] = await Promise.all([
    listAllDashboardStudents(),
    listAllDashboardTechRows(),
    optionalRows(client.from('tech_skills').select('id,name,category').eq('is_active', true)),
    listAllDashboardCommunicationRows(),
    optionalRows(
      client
        .from('placement_events')
        .select('*')
        .neq('status', 'cancelled')
        .gte('starts_at', requestedAt)
        .order('starts_at', { ascending: true })
        .limit(20),
    ),
    optionalRows(
      client
        .from('company_share_links')
        .select('*')
        .eq('is_active', true)
        .or(`expires_at.is.null,expires_at.gt.${requestedAt}`)
        .order('shared_at', { ascending: false })
        .limit(1000),
    ),
    optionalRows(client.from('companies').select('id,is_active').eq('is_active', true)),
    optionalRows(
      client
        .from('audit_logs')
        .select('id,action,description,created_at')
        .order('created_at', { ascending: false })
        .limit(8),
    ),
    client.rpc('get_public_leaderboard', {
      p_search: null,
      p_limit: 5,
      p_offset: 0,
    }),
    client.rpc('get_placement_dashboard', { p_batch: batch }),
  ])

  if (leaderboardResult.error) throw leaderboardResult.error
  if (dashboardAggregateResult.error) throw dashboardAggregateResult.error
  const availableBatches = Array.from(
    new Set(allStudents.map(resolveStudentGraduationBatch).filter(Boolean)),
  ).sort()
  const students =
    batch === 'all'
      ? allStudents
      : allStudents.filter((student) => resolveStudentGraduationBatch(student) === batch)
  const studentIds = new Set(students.map((student) => student.id))
  const rpcAggregate =
    dashboardAggregateResult.data &&
    typeof dashboardAggregateResult.data === 'object' &&
    !Array.isArray(dashboardAggregateResult.data)
      ? (dashboardAggregateResult.data as Record<string, unknown>)
      : null

  const placed = students.filter((student) =>
    ['PLACED', 'OFFERED'].includes(student.placement_status.toUpperCase()),
  ).length
  const readiness = students.map((student) => Number(student.readiness_score) || 0)
  const localEligibility = placementEligibilityCounts(readiness)
  const above60 = Number(rpcAggregate?.above60 ?? localEligibility.above60)
  const above70 = Number(rpcAggregate?.above70 ?? localEligibility.above70)
  const above80 = Number(rpcAggregate?.above80 ?? localEligibility.above80)
  const aggregatePlaced = Number(rpcAggregate?.placed ?? placed)
  const aggregateTotal = Number(rpcAggregate?.totalStudents ?? students.length)
  const placementRate = Number(
    rpcAggregate?.placementPercentage ?? placementPercentage(aggregatePlaced, aggregateTotal),
  )

  const distribution = [0, 20, 40, 60, 80].map(
    (start) => readiness.filter((score) => score >= start && score < start + 20).length,
  )

  const skillNameById = new Map(
    techCatalog.map((skill) => [
      skill.id,
      `${skill.name} ${skill.category}`.toLowerCase(),
    ]),
  )
  const filteredSkills = techRows.filter((row) => studentIds.has(row.student_profile_id))
  const techReadiness = TECH_GROUPS.map((group) => {
    const matching = filteredSkills.filter((row) => {
      const skill = skillNameById.get(row.tech_skill_id) ?? ''
      return group.keys.some((key) => skill.includes(key))
    })
    const groupStudentIds = new Set(matching.map((row) => row.student_profile_id))
    return {
      name: group.name,
      score: average(matching.map((row) => scoreFromLevel(row.proficiency_level))),
      students: groupStudentIds.size,
      studentIds: [...groupStudentIds],
    }
  })

  const latestCommunication = new Map<string, (typeof communicationRows)[number]>()
  for (const row of communicationRows) {
    if (studentIds.has(row.student_profile_id) && !latestCommunication.has(row.student_profile_id)) {
      latestCommunication.set(row.student_profile_id, row)
    }
  }
  const comm = [...latestCommunication.values()]
  const studentById = new Map(students.map((student) => [student.id, student]))
  const communication = {
    score: average(comm.map((row) => row.percentage)),
    confidence: average(comm.map((row) => Number(row.confidence) * 10)),
    presentation: average(comm.map((row) => (Number(row.presentation_skills_total) / 60) * 100)),
    groupDiscussion: average(
      comm.map(
        (row) =>
          ((Number(row.listening_skills) +
            Number(row.teamwork) +
            Number(row.analytical_critical_thinking)) /
            30) *
          100,
      ),
    ),
    hrReadiness: average(
      comm.map(
        (row) =>
          ((Number(row.professionalism) +
            Number(row.grooming) +
            Number(row.courtesy_politeness) +
            Number(row.confidence)) /
            40) *
          100,
      ),
    ),
  }

  const techScore = average(techReadiness.map((row) => row.score))
  const overallScore = Math.round((techScore + communication.score) / 2)
  const batchMatches = (audiences: string[]) =>
    batch === 'all' || !audiences.length || audiences.includes(batch)
  const now = Date.now()
  const filteredEvents = events.filter((event) => batchMatches(event.audience_batches))
  const upcomingEvents = filteredEvents
    .filter((event) => new Date(event.starts_at).getTime() >= now)
    .slice(0, 5)
  const onCampusCompanyIds = new Set(
    filteredEvents
      .filter((event) => event.mode === 'on_campus' && event.company_id)
      .map((event) => event.company_id),
  )

  const leaderboardPayload =
    leaderboardResult.data && typeof leaderboardResult.data === 'object'
      ? (leaderboardResult.data as { rows?: Array<Record<string, unknown>> })
      : {}

  const skillsByStudent = new Map<string, Array<{ proficiency_level: string }>>()
  for (const row of filteredSkills) {
    const list = skillsByStudent.get(row.student_profile_id) ?? []
    list.push({ proficiency_level: row.proficiency_level })
    skillsByStudent.set(row.student_profile_id, list)
  }

  const techBadges = emptyBadgeCounts()
  const communicationBadges = emptyBadgeCounts()
  const yearBuckets = new Map<
    string,
    {
      tech: BadgeCountMap
      communication: BadgeCountMap
      techScores: number[]
      communicationScores: number[]
      studentCount: number
    }
  >()

  const ensureYear = (year: string) => {
    const existing = yearBuckets.get(year)
    if (existing) return existing
    const created = {
      tech: emptyBadgeCounts(),
      communication: emptyBadgeCounts(),
      techScores: [] as number[],
      communicationScores: [] as number[],
      studentCount: 0,
    }
    yearBuckets.set(year, created)
    return created
  }

  for (const student of students) {
    const year = resolveStudentGraduationBatch(student) || 'Unknown'
    const bucket = ensureYear(year)
    bucket.studentCount += 1

    const techScoreValue = computeTechStackScore(skillsByStudent.get(student.id) ?? [])
    const techBadge = classifyTechStackBadge(techScoreValue) as TechStackBadge
    tallyBadge(techBadges, techBadge)
    tallyBadge(bucket.tech, techBadge)
    bucket.techScores.push(techScoreValue)

    const evalRow = latestCommunication.get(student.id)
    if (evalRow) {
      const communicationBadge = classifyCommunicationBadge(
        totalScoreFromPercentage(evalRow.percentage),
      ) as CommunicationBadge | null
      if (communicationBadge) {
        tallyBadge(communicationBadges, communicationBadge)
        tallyBadge(bucket.communication, communicationBadge)
      }
      bucket.communicationScores.push(Number(evalRow.percentage) || 0)
    }
  }

  const byYear = [...yearBuckets.entries()]
    .map(([year, bucket]) => ({
      year,
      tech: bucket.tech,
      communication: bucket.communication,
      techAvg: average(bucket.techScores),
      communicationAvg: average(bucket.communicationScores),
      studentCount: bucket.studentCount,
    }))
    .sort((a, b) => a.year.localeCompare(b.year))

  return {
    batch,
    availableBatches,
    refreshedAt: new Date().toISOString(),
    overview: {
      totalStudents: aggregateTotal,
      above60,
      above70,
      above80,
      placed: aggregatePlaced,
      unplaced: Math.max(0, aggregateTotal - aggregatePlaced),
      placementPercentage: placementRate,
      placementProgress: placementRate,
      readinessDistribution: distribution,
    },
    management: {
      companyLinks: links.filter((link) => batchMatches(link.audience_batches)).length,
      onCampusCompanies: onCampusCompanyIds.size,
      activeCompanies: companies.length,
      upcomingDrives: upcomingEvents.length,
    },
    techReadiness,
    communication,
    overall: {
      tech: techScore,
      communication: communication.score,
      score: overallScore,
      recommendation: dashboardRecommendation(techScore, communication.score),
    },
    upcomingEvents,
    activities: activities.map((activity) => ({
      id: activity.id,
      action: activity.action,
      description: activity.description,
      createdAt: activity.created_at,
    })),
    leaderboard: (leaderboardPayload.rows ?? []).map((row) => ({
      rank: Number(row.rank ?? 0),
      fullName: String(row.fullName ?? ''),
      rollNumber: String(row.rollNumber ?? ''),
      fameXp: Number(row.fameXp ?? row.readinessScore ?? 0),
    })),
    studentDetails: students.map((student) => ({
      id: student.id,
      fullName: student.full_name,
      rollNumber: student.roll_number,
      branch: student.branch,
      readinessScore: Number(student.readiness_score) || 0,
      placementStatus: student.placement_status,
    })),
    communicationParameters: COMMUNICATION_PARAMETERS.map((param) => ({
      key: param.key,
      label: param.label,
      category: param.category,
      average: average(comm.map((row) => (Number(row[param.key]) / 10) * 100)),
    })),
    communicationStudents: comm.map((row) => {
      const student = studentById.get(row.student_profile_id)
      const parameters: Record<string, number> = {}
      for (const param of COMMUNICATION_PARAMETERS) {
        parameters[param.key] = Number(row[param.key]) || 0
      }
      return {
        id: row.student_profile_id,
        fullName: student?.full_name ?? 'Unknown student',
        rollNumber: student?.roll_number ?? '',
        percentage: Number(row.percentage) || 0,
        totalScore: Number(row.total_score) || 0,
        grade: String(row.grade ?? ''),
        parameters,
      }
    }),
    companyLinkDetails: links
      .filter((link) => batchMatches(link.audience_batches))
      .map((link) => ({
        id: link.id,
        label: link.label || 'Company opportunity',
        url: link.url,
        batches: link.audience_batches,
      })),
    skillBadges: {
      tech: techBadges,
      communication: communicationBadges,
      techTotal: students.length,
      communicationTotal: Object.values(communicationBadges).reduce((sum, value) => sum + value, 0),
      byYear,
    },
  }
}

export async function listPlacementEvents(): Promise<PlacementEventRow[]> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('placement_events')
    .select('*')
    .order('starts_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function createPlacementEvent(
  input: Database['public']['Tables']['placement_events']['Insert'],
) {
  const client = requireSupabase()
  const { data, error } = await client.from('placement_events').insert(input).select().single()
  if (error) throw error
  return data
}

export async function schedulePlacementDrive(input: {
  title: string
  companyId: string | null
  startsAt: string
  venue?: string
  mode?: string
  audienceBatches?: string[]
  registrationUrl?: string | null
  registrationLabel?: string | null
}) {
  if (input.registrationUrl) assertSafeShareUrl(input.registrationUrl)
  const client = requireSupabase()
  const { data, error } = await client.rpc('schedule_placement_drive', {
    p_title: input.title,
    p_company_id: input.companyId,
    p_starts_at: input.startsAt,
    p_venue: input.venue ?? '',
    p_mode: input.mode ?? 'on_campus',
    p_audience_batches: input.audienceBatches ?? [],
    p_registration_url: input.registrationUrl ?? null,
    p_registration_label: input.registrationLabel ?? null,
  })
  if (error) throw error
  return data
}

export async function updatePlacementEvent(
  id: string,
  input: Database['public']['Tables']['placement_events']['Update'],
) {
  const client = requireSupabase()
  const { data, error } = await client
    .from('placement_events')
    .update(input)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function listCompanyShareLinks(): Promise<CompanyShareLinkRow[]> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('company_share_links')
    .select('*')
    .order('shared_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function createCompanyShareLink(
  input: Database['public']['Tables']['company_share_links']['Insert'],
) {
  assertSafeShareUrl(input.url)
  const client = requireSupabase()
  const { data, error } = await client.from('company_share_links').insert(input).select().single()
  if (error) throw error
  return data
}

export async function updateCompanyShareLink(
  id: string,
  input: Database['public']['Tables']['company_share_links']['Update'],
) {
  if (input.url) assertSafeShareUrl(input.url)
  const client = requireSupabase()
  const { data, error } = await client
    .from('company_share_links')
    .update(input)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

function assertSafeShareUrl(value: string) {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new Error('Enter a valid registration URL.')
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('Registration links must use HTTP or HTTPS.')
  }
}

export async function listPlacementNotifications(role?: PlacementRole | null) {
  const client = requireSupabase()
  let query = client
    .from('placement_notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(30)
  if (role) query = query.or(`audience_role.eq.${role},audience_role.is.null`)
  const { data, error } = await query
  if (error) throw error
  const notifications = data ?? []
  const {
    data: { user },
  } = await client.auth.getUser()
  if (!user || !notifications.length) return notifications
  const { data: receipts, error: receiptError } = await client
    .from('placement_notification_reads')
    .select('notification_id,read_at')
    .eq('user_id', user.id)
    .in('notification_id', notifications.map((notification) => notification.id))
  if (receiptError) {
    if (/placement_notification_reads|schema cache|does not exist/i.test(receiptError.message)) {
      return notifications
    }
    throw receiptError
  }
  const readByNotification = new Map(
    (receipts ?? []).map((receipt) => [receipt.notification_id, receipt.read_at]),
  )
  return notifications.map((notification) => ({
    ...notification,
    read_at: readByNotification.get(notification.id) ?? null,
  }))
}

export async function listPlacementNotificationHistory() {
  const client = requireSupabase()
  const { data, error } = await client
    .from('placement_notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw error
  return data ?? []
}

export async function markPlacementNotificationRead(id: string) {
  const client = requireSupabase()
  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser()
  if (userError) throw userError
  if (!user) throw new Error('Sign in to mark notifications as read.')
  const { error } = await client
    .from('placement_notification_reads')
    .upsert(
      { notification_id: id, user_id: user.id, read_at: new Date().toISOString() },
      { onConflict: 'notification_id,user_id' },
    )
  if (error) throw error
}

export async function createPlacementNotification(
  input: Database['public']['Tables']['placement_notifications']['Insert'],
) {
  const client = requireSupabase()
  const { data, error } = await client
    .from('placement_notifications')
    .insert(input)
    .select()
    .single()
  if (error) throw error
  return data
}

