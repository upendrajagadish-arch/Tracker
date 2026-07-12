import { useEffect, useState } from 'react'
import { useParams } from '@tanstack/react-router'
import { ProfilePage } from '@/pages/ProfilePage'
import { PlacementLink } from '@/components/placement/PlacementLink'
import { Button } from '@/components/ui/button'
import { PlacementShell, usePlacementPaths } from '@/components/placement/PlacementShell'
import { StudentResumeViewer } from '@/components/placement/StudentResumeViewer'
import { StudentTechStackCard } from '@/components/placement/StudentTechStackCard'
import {
  CompletenessBar,
  PlacementStatusBadge,
  ReadinessStatusBadge,
} from '@/components/placement/PlacementBadges'
import { PlacementEmptyState, PlacementLoadingBlock } from '@/components/placement/PlacementStates'
import {
  PlacementAlerts,
  PlacementPageBody,
  PlacementPageStack,
  PlacementSectionCard,
  formatEnumLabel,
} from '@/components/placement/PlacementUi'
import { getStudent } from '@/api/placement/students'
import {
  ensureStudentCodingProfile,
  getStudentCodingSnapshot,
  studentUsernamesFromProfile,
  type StudentCodingSnapshotRow,
} from '@/api/placement/studentCodingProfile'
import { listStudentSkills, type StudentTechSkillWithMeta } from '@/api/placement/techSkills'
import { StudentPerformanceShare } from '@/components/placement/StudentPerformanceShare'
import { canManageStudents, canManageResumes } from '@/lib/placementNavigation'
import { hasPermission } from '@/lib/placementPermissions'
import { countLinkedPlatforms, resolvePlatformHandles } from '@/lib/studentPlatformHandles'
import { ALL_PLATFORMS } from '@/api/unifiedClient'

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-1 border-b border-border py-2 text-sm last:border-0 sm:grid-cols-3 sm:gap-2">
      <dt className="font-medium text-muted-foreground">{label}</dt>
      <dd className="text-foreground sm:col-span-2">{children ?? '—'}</dd>
    </div>
  )
}

function snapshotStatusLabel(snapshot: StudentCodingSnapshotRow | null, syncing: boolean) {
  if (syncing) return 'Fetching coding platform data…'
  if (!snapshot?.fetched_at) return 'Coding profile not synced yet'
  const when = new Date(snapshot.fetched_at).toLocaleString()
  switch (snapshot.fetch_status) {
    case 'success':
      return `Coding profile synced ${when}`
    case 'partial':
      return `Coding profile partially synced ${when}`
    case 'failed':
      return `Coding profile sync failed ${when}`
    case 'no_handles':
      return 'Add platform handles to build a coding profile'
    default:
      return `Last sync ${when}`
  }
}

export function StudentDetailPage() {
  const { id } = useParams({ strict: false }) as { id: string }
  const { base, role } = usePlacementPaths()
  const canManage = canManageStudents(role)
  const canResumes = canManageResumes(role)
  const [student, setStudent] = useState<Awaited<ReturnType<typeof getStudent>>>(null)
  const [techSkills, setTechSkills] = useState<StudentTechSkillWithMeta[]>([])
  const [snapshot, setSnapshot] = useState<StudentCodingSnapshotRow | null>(null)
  const [syncingProfile, setSyncingProfile] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [publicShareUrl, setPublicShareUrl] = useState<string | null>(null)
  const canShare = hasPermission(role, 'students:update')

  const loadStudent = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getStudent(id)
      if (!data) setError('Student not found')
      setStudent(data)
      if (data) {
        const [skills, existingSnapshot] = await Promise.all([
          listStudentSkills(data.id),
          getStudentCodingSnapshot(data.id).catch(() => null),
        ])
        setTechSkills(skills)
        setSnapshot(existingSnapshot)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load student')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadStudent()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    if (!student) return
    const handles = resolvePlatformHandles(student)
    const hasHandles = ALL_PLATFORMS.some((platform) => handles[platform]?.trim())
    if (!hasHandles) return

    let cancelled = false
    void (async () => {
      setSyncingProfile(true)
      try {
        const next = await ensureStudentCodingProfile(student)
        if (!cancelled) setSnapshot(next)
      } catch (e) {
        if (!cancelled) {
          setError((prev) => prev ?? (e instanceof Error ? e.message : 'Failed to sync coding profile'))
        }
      } finally {
        if (!cancelled) setSyncingProfile(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [student])

  const linkedPlatforms = student ? countLinkedPlatforms(resolvePlatformHandles(student)) : 0
  const resumeUploadHref = base && canResumes ? `${base}/resumes` : undefined
  const platformHandles = student ? resolvePlatformHandles(student) : {}
  const hasPlatformHandles = ALL_PLATFORMS.some((platform) => platformHandles[platform]?.trim())
  const profileUsernames = student ? studentUsernamesFromProfile(student) : null

  return (
    <PlacementShell
      title="Student profile"
      headerShareUrl={publicShareUrl ?? undefined}
      headerShareTitle={student ? `${student.full_name} — Student Performance` : undefined}
    >
      <PlacementPageStack>
        <PlacementAlerts error={error} />

        <PlacementPageBody
          loading={loading}
          loadingLabel="Loading student profile…"
          empty={!loading && !student && !error ? (
            <PlacementEmptyState
              title="Student not found"
              description="This student profile may have been removed or the link is invalid."
            />
          ) : undefined}
        >
          {student ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
                <div>
                  <h1 className="font-pixel text-2xl text-foreground">{student.full_name}</h1>
                  <p className="mt-1 text-sm text-primary">{student.email || 'No email recorded'}</p>
                  <p className="mt-2 font-mono text-xs text-muted-foreground">
                    {student.roll_number} · {student.branch || 'Branch not set'} · {student.batch || 'Year not set'}
                  </p>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">
                    {snapshotStatusLabel(snapshot, syncingProfile)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {base ? (
                    <Button asChild variant="outline" size="sm">
                      <PlacementLink href={`${base}/students`}>← Student tracker</PlacementLink>
                    </Button>
                  ) : null}
                  {canManage && base ? (
                    <Button asChild variant="outline" size="sm">
                      <PlacementLink href={`${base}/students/$id/edit`} params={{ id }}>Edit profile</PlacementLink>
                    </Button>
                  ) : null}
                  {canShare ? (
                    <StudentPerformanceShare
                      studentProfileId={student.id}
                      studentName={student.full_name}
                      onShareUrl={setPublicShareUrl}
                    />
                  ) : null}
                </div>
              </div>

              {hasPlatformHandles && profileUsernames ? (
                <div className="-mx-4 md:-mx-0">
                  <ProfilePage
                    usernames={profileUsernames}
                    owner={{
                      username: student.roll_number,
                      displayName: student.full_name,
                      avatarUrl: null,
                    }}
                    profileLabel="student profile"
                    mode="placement"
                    subtitle={student.email || null}
                    hideFooter
                    hideShare
                    backTo={base ? { to: `${base}/students`, label: '← student tracker' } : undefined}
                  />
                </div>
              ) : (
                <PlacementSectionCard title="Student profile">
                  <PlacementEmptyState
                    title="No coding platforms linked"
                    description="Add GitHub or coding platform usernames on the edit form. The student profile will fetch and store coding stats automatically."
                    action={canManage && base ? (
                      <Button asChild size="sm" variant="outline">
                        <PlacementLink href={`${base}/students/$id/edit`} params={{ id }}>Add platform handles</PlacementLink>
                      </Button>
                    ) : undefined}
                  />
                </PlacementSectionCard>
              )}

              {syncingProfile ? <PlacementLoadingBlock label="Syncing coding profile to database…" /> : null}

              <div className="grid gap-6 lg:grid-cols-2">
                <PlacementSectionCard title="Academic & placement">
                  <dl>
                    <DetailRow label="CGPA">{student.cgpa ?? '—'}</DetailRow>
                    <DetailRow label="Backlogs">{student.active_backlogs}</DetailRow>
                    <DetailRow label="Graduation year">{student.graduation_year ?? student.batch ?? '—'}</DetailRow>
                    <DetailRow label="Placement"><PlacementStatusBadge status={student.placement_status} /></DetailRow>
                    <DetailRow label="Eligible">{student.is_placement_eligible ? 'Yes' : 'No'}</DetailRow>
                    <DetailRow label="Profile completeness"><CompletenessBar value={student.profile_completeness} /></DetailRow>
                    <DetailRow label="Platforms linked">{linkedPlatforms}</DetailRow>
                    {snapshot ? (
                      <DetailRow label="Problems solved (cached)">{snapshot.total_solved}</DetailRow>
                    ) : null}
                  </dl>
                </PlacementSectionCard>

                <PlacementSectionCard title="Readiness">
                  <dl>
                    <DetailRow label="Readiness score">{student.readiness_score}</DetailRow>
                    <DetailRow label="Status"><ReadinessStatusBadge status={student.readiness_status} /></DetailRow>
                    <DetailRow label="Risk">{formatEnumLabel(student.risk_level)}</DetailRow>
                    <DetailRow label="Skills summary">{student.skills_summary || '—'}</DetailRow>
                    <DetailRow label="Career interest">{student.career_interest || '—'}</DetailRow>
                    <DetailRow label="Tech skills recorded">{techSkills.length}</DetailRow>
                  </dl>
                </PlacementSectionCard>
              </div>

              <PlacementSectionCard title="Resume">
                <StudentResumeViewer
                  studentProfileId={student.id}
                  canUpload={canResumes}
                  uploadHref={resumeUploadHref}
                />
              </PlacementSectionCard>

              <PlacementSectionCard title="GitHub & platform links">
                <dl>
                  <DetailRow label="GitHub">
                    {student.github_url ? (
                      <a href={student.github_url} className="break-all text-primary hover:underline" target="_blank" rel="noreferrer">
                        {student.github_url}
                      </a>
                    ) : platformHandles.github ? (
                      <span className="font-mono">@{platformHandles.github}</span>
                    ) : '—'}
                  </DetailRow>
                  <DetailRow label="LinkedIn">
                    {student.linkedin_url ? (
                      <a href={student.linkedin_url} className="break-all text-primary hover:underline" target="_blank" rel="noreferrer">
                        {student.linkedin_url}
                      </a>
                    ) : '—'}
                  </DetailRow>
                  <DetailRow label="Portfolio">
                    {student.portfolio_url ? (
                      <a href={student.portfolio_url} className="break-all text-primary hover:underline" target="_blank" rel="noreferrer">
                        {student.portfolio_url}
                      </a>
                    ) : '—'}
                  </DetailRow>
                </dl>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {Object.entries(platformHandles).map(([platform, handle]) => (
                    <div key={platform} className="flex justify-between rounded-md border border-border bg-background/30 px-3 py-2 text-sm">
                      <span className="capitalize text-muted-foreground">{platform}</span>
                      <span className="font-mono text-foreground">@{handle}</span>
                    </div>
                  ))}
                </div>
              </PlacementSectionCard>

              <StudentTechStackCard studentProfileId={student.id} onChanged={() => void loadStudent()} />

              <PlacementSectionCard title="Projects">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                  {student.projects_summary?.trim() || 'No projects summary recorded.'}
                </p>
              </PlacementSectionCard>
            </>
          ) : null}
        </PlacementPageBody>
      </PlacementPageStack>
    </PlacementShell>
  )
}
