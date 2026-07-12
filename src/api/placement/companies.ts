import { requireSupabase } from '@/lib/supabase'
import { logPlacementAudit } from '@/lib/placementAudit'
import type { Database } from '@/types/supabase'

export type CompanyRow = Database['public']['Tables']['companies']['Row']
export type CompanyRequirementRow = Database['public']['Tables']['company_requirements']['Row']

export interface CreateCompanyInput {
  name: string
  industry?: string
  location?: string
  contactEmail?: string
  isActive?: boolean
}

export interface CreateRequirementInput {
  roleTitle: string
  eligibleBranches?: string[]
  eligibleBatches?: string[]
  minCgpa?: number | null
  requiredSkills?: string[]
  preferredSkills?: string[]
  minReadinessScore?: number | null
  status?: string
}

export async function listCompanies(activeOnly = true): Promise<CompanyRow[]> {
  const client = requireSupabase()
  let query = client.from('companies').select('*').order('name', { ascending: true })
  if (activeOnly) query = query.eq('is_active', true)
  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function getCompany(companyId: string): Promise<CompanyRow | null> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('companies')
    .select('*')
    .eq('id', companyId)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function createCompany(input: CreateCompanyInput): Promise<CompanyRow> {
  if (!input.name.trim()) throw new Error('Company name is required.')
  const client = requireSupabase()
  const { data, error } = await client
    .from('companies')
    .insert({
      name: input.name.trim(),
      industry: input.industry?.trim() ?? '',
      location: input.location?.trim() ?? '',
      contact_email: input.contactEmail?.trim() ?? '',
      is_active: input.isActive ?? true,
    })
    .select()
    .single()
  if (error) throw error

  await logPlacementAudit({
    action: 'company.create',
    entityType: 'company',
    entityId: data.id,
    description: `Created company ${data.name}`,
  })

  return data
}

export async function listRequirements(companyId: string): Promise<CompanyRequirementRow[]> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('company_requirements')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function createRequirement(companyId: string, input: CreateRequirementInput): Promise<CompanyRequirementRow> {
  if (!input.roleTitle.trim()) throw new Error('Role title is required.')
  const client = requireSupabase()
  const { data, error } = await client
    .from('company_requirements')
    .insert({
      company_id: companyId,
      role_title: input.roleTitle.trim(),
      eligible_branches: input.eligibleBranches ?? [],
      eligible_batches: input.eligibleBatches ?? [],
      min_cgpa: input.minCgpa ?? null,
      required_skills: input.requiredSkills ?? [],
      preferred_skills: input.preferredSkills ?? [],
      min_readiness_score: input.minReadinessScore ?? null,
      status: input.status ?? 'draft',
    })
    .select()
    .single()
  if (error) throw error

  await logPlacementAudit({
    action: 'requirement.create',
    entityType: 'company_requirement',
    entityId: data.id,
    description: `Created requirement ${data.role_title}`,
    metadata: { companyId },
  })

  return data
}

export async function getRequirement(requirementId: string): Promise<CompanyRequirementRow | null> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('company_requirements')
    .select('*')
    .eq('id', requirementId)
    .maybeSingle()
  if (error) throw error
  return data
}
