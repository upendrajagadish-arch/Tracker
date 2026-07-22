import { requireSupabase } from '@/lib/supabase'
import { logPlacementAudit } from '@/lib/placementAudit'
import {
  classifyTechStackBadgeFromSkills,
  techStackBadgePercent,
} from '@/lib/techStackBadge'
import type { Database } from '@/types/supabase'

export type TechSkillRow = Database['public']['Tables']['tech_skills']['Row']
export type StudentTechSkillRow = Database['public']['Tables']['student_tech_skills']['Row']
export type StudentRoleInterestRow = Database['public']['Tables']['student_role_interests']['Row']
export type StudentProfileRow = Database['public']['Tables']['student_profiles']['Row']

export const SKILL_CATEGORIES = [
  'PROGRAMMING_LANGUAGE',
  'WEB_TECHNOLOGY',
  'DATABASE',
  'FRAMEWORK',
  'TOOL',
  'CLOUD',
  'DATA_ANALYTICS',
  'AI_ML',
  'CYBERSECURITY',
  'SOFT_SKILL',
  'OTHER',
] as const

export const PROFICIENCY_LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as const
export const VERIFICATION_STATUSES = [
  'SELF_DECLARED',
  'FACULTY_VERIFIED',
  'PERFORMANCE_VERIFIED',
  'RESUME_EVIDENCE',
  'GITHUB_EVIDENCE',
  'NOT_VERIFIED',
] as const
export const INTEREST_LEVELS = ['LOW', 'MEDIUM', 'HIGH'] as const
export const READINESS_LEVELS = ['NOT_READY', 'LEARNING', 'NEAR_READY', 'READY'] as const
export const DEFAULT_ROLE_INTERESTS = [
  'Web Developer',
  'Software Developer',
  'Java Developer',
  'Python Developer',
  'Data Analyst',
  'AI/ML Engineer',
  'Cybersecurity Analyst',
  'Cloud Engineer',
  'Business Analyst',
  'QA Tester',
] as const

export type SkillCategory = (typeof SKILL_CATEGORIES)[number]
export type ProficiencyLevel = (typeof PROFICIENCY_LEVELS)[number]
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number]
export type InterestLevel = (typeof INTEREST_LEVELS)[number]
export type ReadinessLevel = (typeof READINESS_LEVELS)[number]

export interface StudentTechSkillWithMeta extends StudentTechSkillRow {
  tech_skill: TechSkillRow | null
  added_by?: { full_name: string; email: string } | null
  verified_by?: { full_name: string; email: string } | null
}

export interface AddStudentSkillInput {
  techSkillId: string
  proficiencyLevel?: ProficiencyLevel
  verificationStatus?: VerificationStatus
  evidenceSource?: string
  notes?: string
  assessedByName?: string
}

export interface UpdateStudentSkillInput {
  proficiencyLevel?: ProficiencyLevel
  verificationStatus?: VerificationStatus
  evidenceSource?: string
  notes?: string
  assessedByName?: string
}

export interface UpsertRoleInterestInput {
  roleName: string
  interestLevel?: InterestLevel
  readinessLevel?: ReadinessLevel
  notes?: string
}

export interface TechStackFilters {
  q?: string
  branch?: string
  batch?: string
  graduationYear?: number
  skillId?: string
  category?: string
  proficiencyLevel?: string
  verificationStatus?: string
  roleInterest?: string
}

export interface TechStackStudentRow {
  student: StudentProfileRow
  skills: StudentTechSkillWithMeta[]
  roleInterests: StudentRoleInterestRow[]
  skillsCount: number
  topSkills: string[]
  verifiedSkillsCount: number
  primaryRoleInterest: StudentRoleInterestRow | null
  lastUpdated: string | null
}

export interface TechStackDashboardStats {
  studentsWithTechStack: number
  averageVerifiedSkillsPerStudent: number
  topSkills: Array<{ skill: string; studentCount: number }>
  categoryDistribution: Array<{ category: string; studentCount: number }>
  badgeCounts: {
    gold: number
    silver: number
    bronze: number
    poor: number
  }
  badgePercents: {
    gold: number
    silver: number
    bronze: number
    poor: number
  }
  filteredTotal: number
}

export async function listTechSkills(activeOnly = true): Promise<TechSkillRow[]> {
  const client = requireSupabase()
  let query = client.from('tech_skills').select('*').order('category', { ascending: true }).order('name', { ascending: true })
  if (activeOnly) query = query.eq('is_active', true)
  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

function slugifySkillName(name: string) {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/\+/g, 'plus')
    .replace(/#/g, 'sharp')
    .replace(/\./g, 'dot')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
  return base || `skill-${Date.now()}`
}

function namesMatch(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

function toErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message
  if (error && typeof error === 'object' && 'message' in error) {
    const message = String((error as { message: unknown }).message || '').trim()
    if (message) return message
  }
  return fallback
}

function normalizeSkillCategory(value: string | undefined): SkillCategory {
  const normalized = String(value || 'OTHER').trim().toUpperCase()
  return SKILL_CATEGORIES.includes(normalized as SkillCategory)
    ? (normalized as SkillCategory)
    : 'OTHER'
}

function normalizeProficiency(value?: string): ProficiencyLevel {
  const normalized = (value || 'BEGINNER').toUpperCase()
  return PROFICIENCY_LEVELS.includes(normalized as ProficiencyLevel) ? normalized as ProficiencyLevel : 'BEGINNER'
}

function normalizeVerification(value?: string): VerificationStatus {
  const normalized = (value || 'SELF_DECLARED').toUpperCase()
  if (normalized === 'VERIFIED') return 'FACULTY_VERIFIED'
  return VERIFICATION_STATUSES.includes(normalized as VerificationStatus) ? normalized as VerificationStatus : 'SELF_DECLARED'
}

function normalizeInterest(value?: string): InterestLevel {
  const normalized = (value || 'MEDIUM').toUpperCase()
  return INTEREST_LEVELS.includes(normalized as InterestLevel) ? normalized as InterestLevel : 'MEDIUM'
}

function normalizeReadiness(value?: string): ReadinessLevel {
  const normalized = (value || 'LEARNING').toUpperCase()
  return READINESS_LEVELS.includes(normalized as ReadinessLevel) ? normalized as ReadinessLevel : 'LEARNING'
}

export function isVerifiedSkill(status: string): boolean {
  return ['FACULTY_VERIFIED', 'PERFORMANCE_VERIFIED', 'RESUME_EVIDENCE', 'GITHUB_EVIDENCE', 'verified'].includes(status)
}

async function attachTechSkills(rows: StudentTechSkillRow[]): Promise<StudentTechSkillWithMeta[]> {
  if (!rows.length) return []
  const client = requireSupabase()
  const skillIds = [...new Set(rows.map((row) => row.tech_skill_id))]
  const { data: skills, error } = await client.from('tech_skills').select('*').in('id', skillIds)
  if (error) throw error
  const byId = new Map((skills ?? []).map((skill) => [skill.id, skill]))

  const userIds = [...new Set(rows.flatMap((row) => [row.added_by_user_id, row.verified_by_user_id]).filter(Boolean) as string[])]
  const { data: users, error: usersError } = userIds.length
    ? await client.from('placement_user_profiles').select('id, full_name, email').in('id', userIds)
    : { data: [], error: null }
  if (usersError) throw usersError
  const userById = new Map((users ?? []).map((user) => [user.id, user]))

  return rows.map((row) => ({
    ...row,
    tech_skill: byId.get(row.tech_skill_id) ?? null,
    added_by: row.added_by_user_id ? userById.get(row.added_by_user_id) ?? null : null,
    verified_by: row.verified_by_user_id ? userById.get(row.verified_by_user_id) ?? null : null,
  }))
}

export async function listStudentSkills(studentProfileId: string): Promise<StudentTechSkillWithMeta[]> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('student_tech_skills')
    .select('*')
    .eq('student_profile_id', studentProfileId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return attachTechSkills(data ?? [])
}

export async function listStudentRoleInterests(studentProfileId: string): Promise<StudentRoleInterestRow[]> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('student_role_interests')
    .select('*')
    .eq('student_profile_id', studentProfileId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function addStudentSkill(
  studentProfileId: string,
  input: AddStudentSkillInput,
): Promise<StudentTechSkillRow> {
  const client = requireSupabase()
  const { data: auth } = await client.auth.getUser()
  const proficiency = normalizeProficiency(input.proficiencyLevel)
  const verificationStatus = normalizeVerification(input.verificationStatus)
  const verified = isVerifiedSkill(verificationStatus)

  const { data, error } = await client
    .from('student_tech_skills')
    .upsert({
      student_profile_id: studentProfileId,
      tech_skill_id: input.techSkillId,
      proficiency_level: proficiency,
      verification_status: verificationStatus,
      evidence_source: input.evidenceSource?.trim() ?? '',
      notes: input.notes?.trim() ?? '',
      assessed_by_name: input.assessedByName?.trim() ?? '',
      added_by_user_id: auth.user?.id ?? null,
      verified_by_user_id: verified ? auth.user?.id ?? null : null,
      verified_at: verified ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'student_profile_id,tech_skill_id' })
    .select()
    .single()
  if (error) throw error

  await logPlacementAudit({
    action: 'tech_skill.add',
    entityType: 'student_tech_skill',
    entityId: data.id,
    description: `Added tech skill for student ${studentProfileId}`,
    metadata: { studentProfileId, techSkillId: input.techSkillId, proficiencyLevel: data.proficiency_level },
  })

  return data
}

export async function updateStudentSkill(skillRowId: string, input: UpdateStudentSkillInput): Promise<StudentTechSkillRow> {
  const client = requireSupabase()
  const update: Database['public']['Tables']['student_tech_skills']['Update'] = { updated_at: new Date().toISOString() }
  if (input.proficiencyLevel !== undefined) update.proficiency_level = normalizeProficiency(input.proficiencyLevel)
  if (input.verificationStatus !== undefined) update.verification_status = normalizeVerification(input.verificationStatus)
  if (input.evidenceSource !== undefined) update.evidence_source = input.evidenceSource.trim()
  if (input.notes !== undefined) update.notes = input.notes.trim()
  if (input.assessedByName !== undefined) update.assessed_by_name = input.assessedByName.trim()

  const { data, error } = await client
    .from('student_tech_skills')
    .update(update)
    .eq('id', skillRowId)
    .select()
    .single()
  if (error) throw error

  await logPlacementAudit({
    action: 'tech_skill.update',
    entityType: 'student_tech_skill',
    entityId: data.id,
    description: 'Updated student tech skill',
    metadata: { fields: Object.keys(update), studentProfileId: data.student_profile_id, techSkillId: data.tech_skill_id },
  })

  return data
}

export async function removeStudentSkill(skillRowId: string): Promise<void> {
  const client = requireSupabase()
  const { data: existing, error: existingError } = await client
    .from('student_tech_skills')
    .select('*')
    .eq('id', skillRowId)
    .single()
  if (existingError) throw existingError

  const { error } = await client.from('student_tech_skills').delete().eq('id', skillRowId)
  if (error) throw error

  await logPlacementAudit({
    action: 'tech_skill.remove',
    entityType: 'student_tech_skill',
    entityId: skillRowId,
    description: 'Removed student tech skill',
    metadata: { studentProfileId: existing.student_profile_id, techSkillId: existing.tech_skill_id },
  })
}

export async function verifyStudentSkill(skillRowId: string, status: VerificationStatus = 'FACULTY_VERIFIED'): Promise<StudentTechSkillRow> {
  const client = requireSupabase()
  const { data: auth } = await client.auth.getUser()
  const { data, error } = await client
    .from('student_tech_skills')
    .update({
      verification_status: normalizeVerification(status),
      verified_by_user_id: auth.user?.id ?? null,
      verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', skillRowId)
    .select()
    .single()
  if (error) throw error

  await logPlacementAudit({
    action: 'tech_skill.verify',
    entityType: 'student_tech_skill',
    entityId: data.id,
    description: 'Verified student tech skill',
    metadata: { studentProfileId: data.student_profile_id, techSkillId: data.tech_skill_id, verificationStatus: data.verification_status },
  })

  return data
}

export async function createTechSkill(input: { name: string; category: SkillCategory }): Promise<TechSkillRow> {
  if (!input.name.trim()) throw new Error('Skill name is required.')
  const client = requireSupabase()
  const name = input.name.trim()
  const category = normalizeSkillCategory(input.category)

  // Exact display-name match only (C and C++ are different skills).
  const { data: sameNameRows, error: sameNameError } = await client
    .from('tech_skills')
    .select('*')
    .ilike('name', name.replace(/%/g, '\\%').replace(/_/g, '\\_'))
  if (sameNameError) throw new Error(toErrorMessage(sameNameError, 'Failed to look up skill catalog.'))

  const exactName = (sameNameRows ?? []).find((row) => namesMatch(row.name, name))
  if (exactName) {
    if (!exactName.is_active) {
      const { data: reactivated, error: reactivateError } = await client
        .from('tech_skills')
        .update({ is_active: true, category, updated_at: new Date().toISOString() })
        .eq('id', exactName.id)
        .select()
        .single()
      if (reactivateError) throw new Error(toErrorMessage(reactivateError, 'Failed to reactivate skill.'))
      return reactivated
    }
    return exactName
  }

  // Pick a unique name_key that does not collide with a differently named skill (e.g. legacy C++ keyed as "c").
  const baseKey = slugifySkillName(name)
  let nameKey = baseKey
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const candidate = attempt === 0 ? baseKey : `${baseKey}-${attempt + 1}`
    const { data: keyOwner, error: keyError } = await client
      .from('tech_skills')
      .select('id, name')
      .eq('name_key', candidate)
      .maybeSingle()
    if (keyError) throw new Error(toErrorMessage(keyError, 'Failed to reserve skill key.'))
    if (!keyOwner) {
      nameKey = candidate
      break
    }
    if (namesMatch(keyOwner.name, name)) {
      nameKey = candidate
      break
    }
    nameKey = `${baseKey}-${Date.now().toString(36)}`
  }

  const { data, error } = await client
    .from('tech_skills')
    .insert({
      name,
      name_key: nameKey,
      category,
      is_active: true,
    })
    .select()
    .single()
  if (error) {
    if (error.code === '23505') {
      throw new Error(
        `Could not create “${name}” because of a catalog key conflict. Try a slightly different spelling, or refresh and retry.`,
      )
    }
    if (error.code === '42501') {
      throw new Error(
        'Permission denied creating skills. Run scripts/apply-faculty-evaluate-access.sql in the Supabase SQL Editor, then retry.',
      )
    }
    throw new Error(toErrorMessage(error, 'Failed to create skill.'))
  }

  await logPlacementAudit({
    action: 'tech_skill_master.create',
    entityType: 'tech_skill',
    entityId: data.id,
    description: `Created skill master ${data.name}`,
    metadata: { name: data.name, category: data.category },
  })

  return data
}

export async function updateTechSkill(
  skillId: string,
  input: { name?: string; category?: SkillCategory; isActive?: boolean },
): Promise<TechSkillRow> {
  const update: Database['public']['Tables']['tech_skills']['Update'] = { updated_at: new Date().toISOString() }
  if (input.name !== undefined) {
    update.name = input.name.trim()
    update.name_key = slugifySkillName(input.name)
  }
  if (input.category !== undefined) update.category = input.category
  if (input.isActive !== undefined) update.is_active = input.isActive

  const client = requireSupabase()
  const { data, error } = await client
    .from('tech_skills')
    .update(update)
    .eq('id', skillId)
    .select()
    .single()
  if (error) throw error

  await logPlacementAudit({
    action: 'tech_skill_master.update',
    entityType: 'tech_skill',
    entityId: data.id,
    description: `Updated skill master ${data.name}`,
    metadata: { fields: Object.keys(update), isActive: data.is_active },
  })

  return data
}

export async function upsertRoleInterest(
  studentProfileId: string,
  input: UpsertRoleInterestInput,
): Promise<StudentRoleInterestRow> {
  if (!input.roleName.trim()) throw new Error('Role name is required.')
  const client = requireSupabase()
  const { data, error } = await client
    .from('student_role_interests')
    .upsert({
      student_profile_id: studentProfileId,
      role_name: input.roleName.trim(),
      interest_level: normalizeInterest(input.interestLevel),
      readiness_level: normalizeReadiness(input.readinessLevel),
      notes: input.notes?.trim() ?? '',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'student_profile_id,role_name' })
    .select()
    .single()
  if (error) throw error

  await logPlacementAudit({
    action: 'role_interest.upsert',
    entityType: 'student_role_interest',
    entityId: data.id,
    description: `Updated role interest ${data.role_name}`,
    metadata: { studentProfileId, roleName: data.role_name, readinessLevel: data.readiness_level },
  })

  return data
}

export async function removeRoleInterest(roleInterestId: string): Promise<void> {
  const client = requireSupabase()
  const { data: existing, error: existingError } = await client
    .from('student_role_interests')
    .select('*')
    .eq('id', roleInterestId)
    .single()
  if (existingError) throw existingError

  const { error } = await client.from('student_role_interests').delete().eq('id', roleInterestId)
  if (error) throw error

  await logPlacementAudit({
    action: 'role_interest.remove',
    entityType: 'student_role_interest',
    entityId: roleInterestId,
    description: `Removed role interest ${existing.role_name}`,
    metadata: { studentProfileId: existing.student_profile_id, roleName: existing.role_name },
  })
}

function rowMatchesFilters(row: TechStackStudentRow, filters: TechStackFilters) {
  if (filters.skillId && !row.skills.some((skill) => skill.tech_skill_id === filters.skillId)) return false
  if (filters.category && !row.skills.some((skill) => skill.tech_skill?.category === filters.category)) return false
  if (filters.proficiencyLevel && !row.skills.some((skill) => skill.proficiency_level === filters.proficiencyLevel)) return false
  if (filters.verificationStatus && !row.skills.some((skill) => skill.verification_status === filters.verificationStatus)) return false
  if (filters.roleInterest && !row.roleInterests.some((interest) => interest.role_name === filters.roleInterest)) return false
  if (filters.graduationYear != null) {
    const year =
      row.student.graduation_year != null
        ? Number(row.student.graduation_year)
        : Number(String(row.student.academic_batch || row.student.batch || '').match(/(\d{4})\s*$/)?.[1] ?? NaN)
    if (year !== filters.graduationYear) return false
  }
  return true
}

export async function listTechStackStudents(filters: TechStackFilters = {}): Promise<TechStackStudentRow[]> {
  const client = requireSupabase()
  let studentQuery = client.from('student_profiles').select('*').eq('is_active', true).order('updated_at', { ascending: false }).limit(500)
  if (filters.branch) studentQuery = studentQuery.eq('branch', filters.branch)
  if (filters.batch) studentQuery = studentQuery.eq('batch', filters.batch)
  if (filters.q?.trim()) {
    const term = `%${filters.q.trim()}%`
    studentQuery = studentQuery.or(`full_name.ilike.${term},roll_number.ilike.${term},email.ilike.${term}`)
  }

  const { data: students, error: studentsError } = await studentQuery
  if (studentsError) throw studentsError
  const studentIds = (students ?? []).map((student) => student.id)
  if (!studentIds.length) return []

  const [{ data: skillRows, error: skillError }, { data: roleRows, error: roleError }] = await Promise.all([
    client.from('student_tech_skills').select('*').in('student_profile_id', studentIds),
    client.from('student_role_interests').select('*').in('student_profile_id', studentIds),
  ])
  if (skillError) throw skillError
  if (roleError) throw roleError

  const attachedSkills = await attachTechSkills(skillRows ?? [])
  const skillsByStudent = new Map<string, StudentTechSkillWithMeta[]>()
  for (const skill of attachedSkills) {
    const list = skillsByStudent.get(skill.student_profile_id) ?? []
    list.push(skill)
    skillsByStudent.set(skill.student_profile_id, list)
  }

  const rolesByStudent = new Map<string, StudentRoleInterestRow[]>()
  for (const role of roleRows ?? []) {
    const list = rolesByStudent.get(role.student_profile_id) ?? []
    list.push(role)
    rolesByStudent.set(role.student_profile_id, list)
  }

  const rows = (students ?? []).map((student) => {
    const skills = skillsByStudent.get(student.id) ?? []
    const roleInterests = rolesByStudent.get(student.id) ?? []
    const topSkills = skills.slice(0, 4).map((skill) => skill.tech_skill?.name ?? skill.tech_skill_id)
    const verifiedSkillsCount = skills.filter((skill) => isVerifiedSkill(skill.verification_status)).length
    const lastUpdated = [...skills.map((skill) => skill.updated_at ?? skill.created_at), ...roleInterests.map((role) => role.updated_at ?? role.created_at)]
      .filter(Boolean)
      .sort()
      .at(-1) ?? null
    const primaryRoleInterest = [...roleInterests].sort((a, b) => {
      const rank = { HIGH: 3, MEDIUM: 2, LOW: 1 }
      return (rank[b.interest_level as InterestLevel] ?? 0) - (rank[a.interest_level as InterestLevel] ?? 0)
    })[0] ?? null

    return {
      student,
      skills,
      roleInterests,
      skillsCount: skills.length,
      topSkills,
      verifiedSkillsCount,
      primaryRoleInterest,
      lastUpdated,
    }
  })

  return rows.filter((row) => rowMatchesFilters(row, filters))
}

export async function getTechStackDashboardStats(
  filters: TechStackFilters = {},
): Promise<TechStackDashboardStats> {
  const rows = await listTechStackStudents(filters)
  const rowsWithSkills = rows.filter((row) => row.skillsCount > 0)
  const skillCounts = new Map<string, number>()
  const categoryCounts = new Map<string, Set<string>>()
  const badgeCounts = { gold: 0, silver: 0, bronze: 0, poor: 0 }

  for (const row of rows) {
    const badge = classifyTechStackBadgeFromSkills(row.skills)
    badgeCounts[badge] += 1
    for (const skill of row.skills) {
      const skillName = skill.tech_skill?.name ?? skill.tech_skill_id
      skillCounts.set(skillName, (skillCounts.get(skillName) ?? 0) + 1)
      const category = skill.tech_skill?.category ?? 'OTHER'
      const set = categoryCounts.get(category) ?? new Set<string>()
      set.add(row.student.id)
      categoryCounts.set(category, set)
    }
  }

  const verifiedTotal = rows.reduce((sum, row) => sum + row.verifiedSkillsCount, 0)
  const filteredTotal = rows.length

  return {
    studentsWithTechStack: rowsWithSkills.length,
    averageVerifiedSkillsPerStudent: rows.length ? Number((verifiedTotal / rows.length).toFixed(1)) : 0,
    topSkills: [...skillCounts.entries()]
      .map(([skill, studentCount]) => ({ skill, studentCount }))
      .sort((a, b) => b.studentCount - a.studentCount)
      .slice(0, 5),
    categoryDistribution: [...categoryCounts.entries()]
      .map(([category, studentIds]) => ({ category, studentCount: studentIds.size }))
      .sort((a, b) => b.studentCount - a.studentCount),
    badgeCounts,
    badgePercents: {
      gold: techStackBadgePercent(badgeCounts.gold, filteredTotal),
      silver: techStackBadgePercent(badgeCounts.silver, filteredTotal),
      bronze: techStackBadgePercent(badgeCounts.bronze, filteredTotal),
      poor: techStackBadgePercent(badgeCounts.poor, filteredTotal),
    },
    filteredTotal,
  }
}
