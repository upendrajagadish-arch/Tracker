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
import { getLatestEvaluationForStudent, listEvaluationsForStudent, type CommunicationEvaluationRow } from '@/api/placement/communicationEvaluations'
import {
  classifyCommunicationBadge,
  formatCommunicationBadge,
  totalScoreFromPercentage,
} from '@/lib/communicationBadge'
import {
  getLatestAptitudeScore,
  getLatestVerbalScore,
  type AptitudeScoreRow,
  type VerbalScoreRow,
} from '@/api/placement/assessmentScores'
import {
  categorySummaryFromChallenges,
  getCodeNowProfile,
  listCodeNowChallenges,
  type CodeNowChallengeRow,
  type CodeNowProfileRow,
} from '@/api/placement/codeNow'
import { StudentPerformanceShare } from '@/components/placement/StudentPerformanceShare'
import { buildStudentPerformanceProfile } from '@/lib/buildStudentPerformanceProfile'
import { downloadStudentPerformancePdf } from '@/lib/downloadStudentPerformancePdf'
import { canManageStudents, canManageResumes, canManageReadiness } from '@/lib/placementNavigation'
import { hasPermission } from '@/lib/placementPermissions'
import { countLinkedPlatforms, resolvePlatformHandles } from '@/lib/studentPlatformHandles'
import { ALL_PLATFORMS } from '@/api/unifiedClient'
import {
  blendCodingPercent,
  buildOverallPerformanceSummary,
  codingPercentFromSolved,
  githubPercentFromActivity,
} from '@/lib/overallPerformance'
import { CODENOW_CATEGORY_LABELS, type CodeNowCategory } from '@/lib/codeNowCategories'
import type { UnifiedCard } from '@/types/unified'

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-1 border-b border-border py-2 text-sm last:border-0 sm:grid-cols-3 sm:gap-2">
      <dt className="font-medium text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words text-foreground sm:col-span-2">{children ?? '—'}</dd>
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
  const canManageComm = canManageReadiness(role)
  const [student, setStudent] = useState<Awaited<ReturnType<typeof getStudent>>>(null)
  const [techSkills, setTechSkills] = useState<StudentTechSkillWithMeta[]>([])
  const [commEval, setCommEval] = useState<CommunicationEvaluationRow | null>(null)
  const [commHistory, setCommHistory] = useState<CommunicationEvaluationRow[]>([])
  const [aptitude, setAptitude] = useState<AptitudeScoreRow | null>(null)
  const [verbal, setVerbal] = useState<VerbalScoreRow | null>(null)
  const [codeNow, setCodeNow] = useState<CodeNowProfileRow | null>(null)
  const [codeNowChallenges, setCodeNowChallenges] = useState<CodeNowChallengeRow[]>([])
  const [snapshot, setSnapshot] = useState<StudentCodingSnapshotRow | null>(null)
  const [syncingProfile, setSyncingProfile] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [publicShareUrl, setPublicShareUrl] = useState<string | null>(null)
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const canShare = hasPermission(role, 'students:update')

  const loadStudent = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getStudent(id)
      if (!data) setError('Student not found')
      setStudent(data)
      if (data) {
        const [skills, existingSnapshot, evaluation, evaluations, apt, verb, cn, cnChallenges] =
          await Promise.all([
            listStudentSkills(data.id),
            getStudentCodingSnapshot(data.id).catch(() => null),
            getLatestEvaluationForStudent(data.id).catch(() => null),
            listEvaluationsForStudent(data.id).catch(() => []),
            getLatestAptitudeScore(data.id).catch(() => null),
            getLatestVerbalScore(data.id).catch(() => null),
            getCodeNowProfile(data.id).catch(() => null),
            listCodeNowChallenges(data.id).catch(() => []),
          ])
        setTechSkills(skills)
        setSnapshot(existingSnapshot)
        setCommEval(evaluation)
        setCommHistory(evaluations)
        setAptitude(apt)
        setVerbal(verb)
        setCodeNow(cn)
        setCodeNowChallenges(cnChallenges)
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

  const handleDownloadPdf = async () => {
    if (!student) return
    setDownloadingPdf(true)
    setError(null)
    try {
      const profile = await buildStudentPerformanceProfile(student.id)
      await downloadStudentPerformancePdf(profile)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to download student PDF')
    } finally {
      setDownloadingPdf(false)
    }
  }

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
  const snapshotCards = (snapshot?.cards as UnifiedCard[] | undefined) ?? []
  const githubCard = snapshotCards.find((c) => c.platform === 'github')
  const overall = student
    ? buildOverallPerformanceSummary({
        codingPercent: blendCodingPercent(
          codingPercentFromSolved(snapshot?.total_solved ?? null),
          codeNow?.percentage ??
            (student.codenow_score != null ? Number(student.codenow_score) : null),
        ),
        githubPercent: githubPercentFromActivity({
          commits: githubCard?.stats.totalSolved ?? null,
          stars: githubCard?.rating?.current ?? githubCard?.contests?.rating ?? null,
        }),
        communicationPercent:
          commEval?.percentage ??
          (student.communication_score != null ? Number(student.communication_score) : null),
        aptitudePercent:
          aptitude?.percentage ??
          (student.aptitude_score != null ? Number(student.aptitude_score) : null),
        verbalPercent:
          verbal?.percentage ?? (student.verbal_score != null ? Number(student.verbal_score) : null),
      })
    : null
  const codeNowCategories = categorySummaryFromChallenges(codeNowChallenges)
  const hasPlatformHandles = ALL_PLATFORMS.some((platform) => platformHandles[platform]?.trim())
  const profileUsernames = student ? studentUsernamesFromProfile(student) : null

  return (
    <PlacementShell
      title="Student profile"
      headerShareUrl={publicShareUrl}
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
                <div className="min-w-0 flex-1">
                  <h1 className="break-words font-pixel text-2xl text-foreground">{student.full_name}</h1>
                  <p className="mt-1 break-all text-sm text-primary">{student.email || 'No email recorded'}</p>
                  <p className="mt-2 break-words font-mono text-xs text-muted-foreground">
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
                      student={student}
                      onShareUrl={setPublicShareUrl}
                    />
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={downloadingPdf}
                    onClick={() => void handleDownloadPdf()}
                  >
                    {downloadingPdf ? 'Preparing PDF…' : 'Download PDF'}
                  </Button>
                </div>
              </div>

              {hasPlatformHandles && profileUsernames ? (
                <div className="overflow-x-auto rounded-card border border-soft">
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
                    <DetailRow label="Communication source">
                      {student.communication_score != null || commEval
                        ? 'Communication Evaluation (structured)'
                        : 'Interview average / default'}
                    </DetailRow>
                  </dl>
                </PlacementSectionCard>
              </div>

              <PlacementSectionCard
                title="Communication Evaluation"
                actions={
                  canManageComm && base ? (
                    <Button asChild size="sm">
                      <PlacementLink
                        href={`${base}/communication/$studentProfileId/edit`}
                        params={{ studentProfileId: student.id }}
                      >
                        New evaluation
                      </PlacementLink>
                    </Button>
                  ) : null
                }
              >
                {commEval || student.communication_score != null ? (
                  <div className="space-y-4">
                    <dl>
                      <DetailRow label="Latest score">
                        {commEval
                          ? `${commEval.total_score}/250`
                          : student.communication_score != null
                            ? `${totalScoreFromPercentage(Number(student.communication_score)) ?? '—'}/250`
                            : '—'}
                      </DetailRow>
                      <DetailRow label="Percentage">
                        {commEval?.percentage ?? student.communication_score ?? '—'}%
                      </DetailRow>
                      <DetailRow label="Grade">
                        {commEval?.grade ?? student.communication_grade ?? '—'}
                      </DetailRow>
                      <DetailRow label="Badge">
                        {formatCommunicationBadge(
                          classifyCommunicationBadge(
                            commEval?.total_score ??
                              totalScoreFromPercentage(
                                student.communication_score != null
                                  ? Number(student.communication_score)
                                  : null,
                              ),
                          ),
                        )}
                      </DetailRow>
                      <DetailRow label="Section totals">
                        Proficiency {commEval?.communication_proficiency_total ?? '—'}/80 ·
                        Presentation {commEval?.presentation_skills_total ?? '—'}/60 ·
                        Behavioural {commEval?.behavioural_skills_total ?? '—'}/110
                      </DetailRow>
                      <DetailRow label="Last evaluated">
                        {(commEval?.evaluation_date || student.last_communication_evaluation_at)
                          ? new Date(
                              commEval?.evaluation_date ||
                                student.last_communication_evaluation_at ||
                                '',
                            ).toLocaleDateString()
                          : '—'}
                      </DetailRow>
                      <DetailRow label="Latest trainer / interviewer">
                        {commEval?.evaluator_name || '—'}
                      </DetailRow>
                    </dl>

                    {commHistory.length > 0 ? (
                      <div>
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          Interview history (staff only)
                        </p>
                        <div className="overflow-x-auto rounded-lg border border-border">
                          <table className="w-full min-w-[520px] text-left text-sm">
                            <thead className="border-b border-border bg-elevated/40 text-[11px] uppercase tracking-wide text-muted-foreground">
                              <tr>
                                <th className="px-3 py-2 font-medium">Date</th>
                                <th className="px-3 py-2 font-medium">Trainer / Interviewer</th>
                                <th className="px-3 py-2 font-medium">Score</th>
                                <th className="px-3 py-2 font-medium">%</th>
                                <th className="px-3 py-2 font-medium">Grade</th>
                              </tr>
                            </thead>
                            <tbody>
                              {commHistory.map((row) => (
                                <tr key={row.id} className="border-b border-border/70 last:border-0">
                                  <td className="px-3 py-2 text-secondary">
                                    {row.evaluation_date
                                      ? new Date(row.evaluation_date).toLocaleDateString()
                                      : '—'}
                                  </td>
                                  <td className="px-3 py-2 font-medium text-foreground">
                                    {row.evaluator_name || '—'}
                                  </td>
                                  <td className="tnum px-3 py-2">{row.total_score}/250</td>
                                  <td className="tnum px-3 py-2">{row.percentage}%</td>
                                  <td className="px-3 py-2">{row.grade}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Not Available</p>
                )}
              </PlacementSectionCard>

              <div className="grid gap-4 lg:grid-cols-3">
                <PlacementSectionCard title="Aptitude Score">
                  {aptitude || student.aptitude_score != null ? (
                    <dl>
                      <DetailRow label="Score">
                        {aptitude ? `${aptitude.score}/${aptitude.max_score}` : '—'}
                      </DetailRow>
                      <DetailRow label="Percentage">
                        {aptitude?.percentage ?? student.aptitude_score ?? '—'}%
                      </DetailRow>
                      <DetailRow label="Grade">
                        {aptitude?.grade ?? student.aptitude_grade ?? '—'}
                      </DetailRow>
                      <DetailRow label="Test">{aptitude?.test_name || '—'}</DetailRow>
                      <DetailRow label="Updated">
                        {(aptitude?.evaluated_at || student.last_aptitude_at)
                          ? new Date(
                              aptitude?.evaluated_at || student.last_aptitude_at || '',
                            ).toLocaleDateString()
                          : '—'}
                      </DetailRow>
                    </dl>
                  ) : (
                    <p className="text-sm text-muted-foreground">Not Available</p>
                  )}
                </PlacementSectionCard>

                <PlacementSectionCard title="Verbal Score">
                  {verbal || student.verbal_score != null ? (
                    <dl>
                      <DetailRow label="Score">
                        {verbal ? `${verbal.score}/${verbal.max_score}` : '—'}
                      </DetailRow>
                      <DetailRow label="Percentage">
                        {verbal?.percentage ?? student.verbal_score ?? '—'}%
                      </DetailRow>
                      <DetailRow label="Grade">
                        {verbal?.grade ?? student.verbal_grade ?? '—'}
                      </DetailRow>
                      <DetailRow label="Test">{verbal?.test_name || '—'}</DetailRow>
                      <DetailRow label="Updated">
                        {(verbal?.evaluated_at || student.last_verbal_at)
                          ? new Date(
                              verbal?.evaluated_at || student.last_verbal_at || '',
                            ).toLocaleDateString()
                          : '—'}
                      </DetailRow>
                    </dl>
                  ) : (
                    <p className="text-sm text-muted-foreground">Not Available</p>
                  )}
                </PlacementSectionCard>

                <PlacementSectionCard title="Overall Performance">
                  {overall ? (
                    <dl>
                      <DetailRow label="Overall">
                        {overall.overallPercent != null
                          ? `${overall.overallPercent}% · ${overall.overallStatus}`
                          : 'Not Available'}
                      </DetailRow>
                      <DetailRow label="Coding">{overall.codingPercent ?? 'Not Available'}
                        {overall.codingPercent != null ? '%' : ''}
                      </DetailRow>
                      <DetailRow label="GitHub">{overall.githubPercent ?? 'Not Available'}
                        {overall.githubPercent != null ? '%' : ''}
                      </DetailRow>
                      <DetailRow label="Communication">
                        {overall.communicationPercent ?? 'Not Available'}
                        {overall.communicationPercent != null ? '%' : ''}
                      </DetailRow>
                      <DetailRow label="Aptitude">
                        {overall.aptitudePercent ?? 'Not Available'}
                        {overall.aptitudePercent != null ? '%' : ''}
                      </DetailRow>
                      <DetailRow label="Verbal">
                        {overall.verbalPercent ?? 'Not Available'}
                        {overall.verbalPercent != null ? '%' : ''}
                      </DetailRow>
                    </dl>
                  ) : (
                    <p className="text-sm text-muted-foreground">Not Available</p>
                  )}
                </PlacementSectionCard>
              </div>

              <PlacementSectionCard title="CodeNow">
                {codeNow || student.codenow_score != null ? (
                  <dl>
                    <DetailRow label="Username">{codeNow?.codenow_username || '—'}</DetailRow>
                    <DetailRow label="Total score">
                      {codeNow
                        ? `${codeNow.total_score}/${codeNow.max_score}`
                        : '—'}
                    </DetailRow>
                    <DetailRow label="Percentage">
                      {codeNow?.percentage ?? student.codenow_score ?? '—'}%
                    </DetailRow>
                    <DetailRow label="Grade">{codeNow?.grade ?? student.codenow_grade ?? '—'}</DetailRow>
                    <DetailRow label="Rank">{codeNow?.rank ?? '—'}</DetailRow>
                    <DetailRow label="Challenges">
                      {codeNow
                        ? `${codeNow.solved_challenges}/${codeNow.total_challenges}`
                        : '—'}
                    </DetailRow>
                    <DetailRow label="Last synced">
                      {(codeNow?.last_synced_at || student.last_codenow_at)
                        ? new Date(
                            codeNow?.last_synced_at || student.last_codenow_at || '',
                          ).toLocaleDateString()
                        : '—'}
                    </DetailRow>
                    <DetailRow label="Categories">
                      {Object.keys(codeNowCategories).length ? (
                        <div className="flex flex-wrap gap-1.5">
                          {Object.entries(codeNowCategories).map(([k, v]) => (
                            <span
                              key={k}
                              className="rounded-md border border-border bg-background/50 px-2 py-0.5 text-xs"
                            >
                              {CODENOW_CATEGORY_LABELS[k as CodeNowCategory] || k}: {v}%
                            </span>
                          ))}
                        </div>
                      ) : (
                        '—'
                      )}
                    </DetailRow>
                  </dl>
                ) : (
                  <p className="text-sm text-muted-foreground">Not Available</p>
                )}
              </PlacementSectionCard>

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
                    <div
                      key={platform}
                      className="flex min-w-0 items-center justify-between gap-2 rounded-md border border-border bg-background/30 px-3 py-2 text-sm"
                    >
                      <span className="shrink-0 capitalize text-muted-foreground">{platform}</span>
                      <span className="min-w-0 truncate font-mono text-foreground" title={`@${handle}`}>
                        @{handle}
                      </span>
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
