import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PlacementShell } from '@/components/placement/PlacementShell'
import { PlacementPageHeader } from '@/components/placement/PlacementPageHeader'
import {
  CompletenessBar,
  PlacementStatusBadge,
  ReadinessStatusBadge,
} from '@/components/placement/PlacementBadges'
import { PlacementEmptyState, PlacementErrorAlert, PlacementLoadingBlock } from '@/components/placement/PlacementStates'
import { requireSupabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { listResumes, uploadResume, getResumeDownloadUrl } from '@/api/placement/resumes'
import { listStudentSkills } from '@/api/placement/techSkills'
import { listReadiness } from '@/api/placement/readiness'
import type { StudentProfile } from '@/types/supabase'

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-1 border-b border-border py-2 text-sm last:border-0 sm:grid-cols-3 sm:gap-2">
      <dt className="font-medium text-muted-foreground">{label}</dt>
      <dd className="text-foreground sm:col-span-2">{children ?? '—'}</dd>
    </div>
  )
}

export function StudentProfilePage() {
  const { user } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)
  const [profile, setProfile] = useState<StudentProfile | null>(null)
  const [activeResume, setActiveResume] = useState<Awaited<ReturnType<typeof listResumes>>['data'][0] | null>(null)
  const [skills, setSkills] = useState<Awaited<ReturnType<typeof listStudentSkills>>>([])
  const [readiness, setReadiness] = useState<Awaited<ReturnType<typeof listReadiness>>['data'][0] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const client = requireSupabase()
      const { data: student, error: profileError } = await client
        .from('student_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()
      if (profileError) throw profileError
      if (!student) {
        setProfile(null)
        return
      }
      setProfile(student)

      const [resumeRes, skillsRes, readinessRes] = await Promise.all([
        listResumes({ studentProfileId: student.id, limit: 1 }).catch(() => ({ data: [] })),
        listStudentSkills(student.id).catch(() => []),
        listReadiness({ studentProfileId: student.id, limit: 1 }).catch(() => ({ data: [] })),
      ])
      setActiveResume(resumeRes.data[0] ?? null)
      setSkills(skillsRes)
      setReadiness(readinessRes.data[0] ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load profile')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    void load()
  }, [load])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile) return
    setUploading(true)
    try {
      await uploadResume({ studentProfileId: profile.id, file, userId: user?.id ?? null })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleDownload = async () => {
    if (!activeResume) return
    try {
      const url = await getResumeDownloadUrl(activeResume.id)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed')
    }
  }

  return (
    <PlacementShell title="My Profile">
      <PlacementPageHeader
        title="My placement profile"
        description="View your placement record, readiness, and resume."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to="/app">Student Performance dashboard</Link>
          </Button>
        }
      />

      {error ? <div className="mb-4"><PlacementErrorAlert message={error} /></div> : null}
      {loading ? <PlacementLoadingBlock /> : null}

      {!loading && !profile ? (
        <PlacementEmptyState
          title="No placement profile linked"
          description="Contact your placement office to link your account to a student record."
        />
      ) : null}

      {profile ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="term-window border-border bg-card/80">
            <CardHeader className="border-b border-border">
              <CardTitle className="text-base">{profile.full_name}</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <dl>
                <DetailRow label="Roll">{profile.roll_number}</DetailRow>
                <DetailRow label="Branch / Batch">{profile.branch} / {profile.batch}</DetailRow>
                <DetailRow label="CGPA">{profile.cgpa ?? '—'}</DetailRow>
                <DetailRow label="Placement"><PlacementStatusBadge status={profile.placement_status} /></DetailRow>
                <DetailRow label="Completeness"><CompletenessBar value={profile.profile_completeness} /></DetailRow>
                <DetailRow label="Readiness">
                  {profile.readiness_score} · <ReadinessStatusBadge status={profile.readiness_status} />
                </DetailRow>
              </dl>
            </CardContent>
          </Card>

          <Card className="term-window border-border bg-card/80">
            <CardHeader className="border-b border-border">
              <CardTitle className="text-base">Resume & skills</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {activeResume ? (
                <div className="text-sm">
                  <p className="font-medium">{activeResume.file_name}</p>
                  <p className="text-muted-foreground">Status: {activeResume.review_status}</p>
                  <Button size="sm" variant="outline" className="mt-2" onClick={() => void handleDownload()}>
                    Download resume
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No active resume uploaded.</p>
              )}

              <div>
                <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleUpload} />
                <Button size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
                  {uploading ? 'Uploading…' : 'Upload resume'}
                </Button>
              </div>

              {skills.length ? (
                <ul className="divide-y divide-border text-sm">
                  {skills.map((s) => (
                    <li key={s.id} className="py-2">{s.tech_skill?.name ?? s.tech_skill_id} · {s.proficiency_level}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No tech skills recorded yet.</p>
              )}

              {readiness ? (
                <p className="text-xs text-muted-foreground">
                  Latest snapshot: {new Date(readiness.calculated_at).toLocaleString()}
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </PlacementShell>
  )
}
