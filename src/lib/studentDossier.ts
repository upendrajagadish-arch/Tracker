import type { Json } from '@/types/supabase'
import type { StudentProfileRow } from '@/api/placement/students'
import type { StudentTechSkillWithMeta } from '@/api/placement/techSkills'
import { countLinkedPlatforms, resolvePlatformHandles } from '@/lib/studentPlatformHandles'

export interface StudentDossierExtras {
  topSkills: string[]
  verifiedSkills: string[]
  projectsSummary: string
  platformHandles: Record<string, string>
  codingSummary: {
    connectedCount: number
    totalSolved: number | null
  }
  resumeId: string | null
}

export function buildDossierExtras(
  student: StudentProfileRow,
  techSkills: StudentTechSkillWithMeta[],
  resume?: { id: string } | null,
): StudentDossierExtras {
  const handles = resolvePlatformHandles(student)
  const topSkills = techSkills
    .map((row) => row.tech_skill?.name ?? '')
    .filter(Boolean)
  const verifiedSkills = techSkills
    .filter((row) => row.verification_status === 'verified')
    .map((row) => row.tech_skill?.name ?? '')
    .filter(Boolean)

  return {
    topSkills,
    verifiedSkills,
    projectsSummary: student.projects_summary ?? '',
    platformHandles: handles as Record<string, string>,
    codingSummary: {
      connectedCount: countLinkedPlatforms(handles),
      totalSolved: null,
    },
    resumeId: resume?.id ?? null,
  }
}

export function dossierExtrasToSnapshotJson(extras: StudentDossierExtras): Json {
  return {
    topSkills: extras.topSkills,
    verifiedSkills: extras.verifiedSkills,
    projectsSummary: extras.projectsSummary,
    platformHandles: extras.platformHandles,
    codingSummary: extras.codingSummary,
    resumeId: extras.resumeId,
  } as Json
}
