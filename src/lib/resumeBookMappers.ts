import type { ResumeBookStudent } from '@/components/placement/InteractiveResumeBook'
import type { ResumeBookStudentRow } from '@/api/placement/resumeBooks'

export function mapSnapshotRow(row: ResumeBookStudentRow): ResumeBookStudent {
  const s = (row.snapshot ?? {}) as Record<string, unknown>
  const skills = String(s.skillsSummary ?? '')
  const topSkills = Array.isArray(s.topSkills)
    ? s.topSkills.map(String)
    : skills.split(',').map((x) => x.trim()).filter(Boolean)
  const coding = s.codingSummary as { connectedCount?: number; totalSolved?: number } | undefined
  return {
    id: row.id,
    order: row.order_index,
    fullName: String(s.fullName ?? ''),
    rollNumber: String(s.rollNumber ?? ''),
    branch: String(s.branch ?? ''),
    batch: String(s.batch ?? ''),
    cgpa: s.cgpa != null ? Number(s.cgpa) : null,
    activeBacklogs: Number(s.activeBacklogs ?? 0),
    readinessScore: s.readinessScore != null ? Number(s.readinessScore) : null,
    readinessStatus: String(s.readinessStatus ?? ''),
    placementStatus: String(s.placementStatus ?? ''),
    linkedinUrl: String(s.linkedinUrl ?? ''),
    githubUrl: String(s.githubUrl ?? ''),
    portfolioUrl: String(s.portfolioUrl ?? ''),
    topSkills,
    verifiedSkills: Array.isArray(s.verifiedSkills) ? s.verifiedSkills.map(String) : [],
    resumeId: s.resumeId ? String(s.resumeId) : undefined,
    resumeDownloadUrl: s.resumeStoragePath ? String(s.resumeStoragePath) : undefined,
    codingSummary: coding
      ? { connectedCount: coding.connectedCount, overallScore: coding.totalSolved ?? undefined }
      : undefined,
    projectSummary: s.projectsSummary ? String(s.projectsSummary) : undefined,
  }
}

export function mapPublicSnapshot(raw: unknown): ResumeBookStudent {
  const s = (raw ?? {}) as Record<string, unknown>
  const skills = String(s.skillsSummary ?? s.topSkills ?? '')
  return {
    id: String(s.studentProfileId ?? s.id ?? ''),
    fullName: String(s.fullName ?? ''),
    rollNumber: String(s.rollNumber ?? ''),
    branch: String(s.branch ?? ''),
    batch: String(s.batch ?? ''),
    cgpa: s.cgpa != null ? Number(s.cgpa) : null,
    activeBacklogs: Number(s.activeBacklogs ?? 0),
    readinessScore: s.readinessScore != null ? Number(s.readinessScore) : null,
    readinessStatus: String(s.readinessStatus ?? ''),
    placementStatus: String(s.placementStatus ?? ''),
    linkedinUrl: String(s.linkedinUrl ?? ''),
    githubUrl: String(s.githubUrl ?? ''),
    portfolioUrl: String(s.portfolioUrl ?? ''),
    topSkills: Array.isArray(s.topSkills)
      ? s.topSkills.map(String)
      : skills.split(',').map((x) => x.trim()).filter(Boolean),
    resumeId: s.resumeId ? String(s.resumeId) : undefined,
    projectSummary: s.projectsSummary ? String(s.projectsSummary) : undefined,
    codingSummary: s.codingSummary as ResumeBookStudent['codingSummary'],
  }
}
