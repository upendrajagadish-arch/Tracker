import { requireSupabase } from '@/lib/supabase'
import { logPlacementAudit } from '@/lib/placementAudit'
import { calculateReadiness } from '@/lib/placementReadiness'
import { calculateMatchScore } from '@/lib/placementMatching'
import type { Database } from '@/types/supabase'
import { listStudentSkills } from '@/api/placement/techSkills'

export type CompanyMatchSnapshotRow = Database['public']['Tables']['company_match_snapshots']['Row']

export interface RunMatchingResult {
  requirementId: string
  matchedStudents: number
  snapshots: CompanyMatchSnapshotRow[]
}

export async function runMatching(requirementId: string): Promise<RunMatchingResult> {
  const client = requireSupabase()

  const { data: requirement, error: requirementError } = await client
    .from('company_requirements')
    .select('*')
    .eq('id', requirementId)
    .single()
  if (requirementError) throw requirementError

  const { data: students, error: studentsError } = await client
    .from('student_profiles')
    .select('*')
    .eq('is_active', true)
  if (studentsError) throw studentsError

  const snapshots: CompanyMatchSnapshotRow[] = []

  for (const student of students ?? []) {
    const [
      resumeRes,
      interviewsRes,
      techSkills,
    ] = await Promise.all([
      client
        .from('student_resumes')
        .select('*')
        .eq('student_profile_id', student.id)
        .eq('is_active', true)
        .maybeSingle(),
      client
        .from('placement_interviews')
        .select('*')
        .eq('roll_number', student.roll_number)
        .order('created_at', { ascending: false })
        .limit(10),
      listStudentSkills(student.id),
    ])
    if (resumeRes.error) throw resumeRes.error
    if (interviewsRes.error) throw interviewsRes.error

    const readiness = calculateReadiness({
      student,
      activeResume: resumeRes.data,
      techSkills,
      interviews: interviewsRes.data ?? [],
    })

    const match = calculateMatchScore({
      student,
      requirement,
      readiness,
      techSkills,
      activeResume: resumeRes.data,
    })

    const { data: snapshot, error: snapshotError } = await client
      .from('company_match_snapshots')
      .upsert({
        company_id: requirement.company_id,
        requirement_id: requirementId,
        student_profile_id: student.id,
        match_score: match.matchScore,
        match_status: match.matchStatus,
        eligibility_status: match.eligibilityStatus,
        matched_skills: match.matchedSkills,
        missing_required_skills: match.missingRequiredSkills,
        calculated_at: new Date().toISOString(),
      }, { onConflict: 'requirement_id,student_profile_id' })
      .select()
      .single()
    if (snapshotError) throw snapshotError
    snapshots.push(snapshot)
  }

  await logPlacementAudit({
    action: 'matching.run',
    entityType: 'company_requirement',
    entityId: requirementId,
    description: `Ran matching for requirement ${requirement.role_title}`,
    metadata: { matchedStudents: snapshots.length },
  })

  return {
    requirementId,
    matchedStudents: snapshots.length,
    snapshots,
  }
}

export async function listMatches(requirementId: string): Promise<CompanyMatchSnapshotRow[]> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('company_match_snapshots')
    .select('*')
    .eq('requirement_id', requirementId)
    .order('match_score', { ascending: false })
  if (error) throw error
  return data ?? []
}
