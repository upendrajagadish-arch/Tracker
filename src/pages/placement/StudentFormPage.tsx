import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from '@tanstack/react-router'
import { Download, FileText, Upload } from 'lucide-react'
import { PlacementLink } from '@/components/placement/PlacementLink'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PlacementShell, usePlacementPaths } from '@/components/placement/PlacementShell'
import { PlacementPageHeader } from '@/components/placement/PlacementPageHeader'
import { PLACEMENT_STATUSES } from '@/components/placement/PlacementBadges'
import { PlacementErrorAlert, PlacementLoadingBlock } from '@/components/placement/PlacementStates'
import { createStudent, getStudent, updateStudent, type CreateStudentInput } from '@/api/placement/students'
import { getActiveResume, getResumeDownloadUrl, uploadResume, type StudentResumeRow } from '@/api/placement/resumes'
import { useAuth } from '@/hooks/useAuth'
import { canManageResumes } from '@/lib/placementNavigation'
import { ALL_PLATFORMS } from '@/api/unifiedClient'
import type { PlatformHandles } from '@/lib/studentPlatformHandles'
import type { Platform } from '@/types/api'

const emptyForm: CreateStudentInput = {
  rollNumber: '',
  fullName: '',
  email: '',
  phone: '',
  branch: '',
  batch: '',
  dateOfBirth: null,
  cgpa: null,
  activeBacklogs: 0,
  graduationYear: null,
  placementStatus: 'NOT_STARTED',
  linkedinUrl: '',
  githubUrl: '',
  portfolioUrl: '',
  skillsSummary: '',
  careerInterest: '',
  platformHandles: {},
  projectsSummary: '',
  isPlacementEligible: true,
}

export function StudentFormPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { base, role } = usePlacementPaths()
  const canUploadResume = canManageResumes(role)
  const fileRef = useRef<HTMLInputElement>(null)
  const { id } = useParams({ strict: false }) as { id?: string }
  const isEdit = Boolean(id && id !== 'new')
  const [form, setForm] = useState<CreateStudentInput>(emptyForm)
  const [activeResume, setActiveResume] = useState<StudentResumeRow | null>(null)
  const [resumeUploading, setResumeUploading] = useState(false)
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadResume = async (studentProfileId: string) => {
    try {
      setActiveResume(await getActiveResume(studentProfileId))
    } catch {
      setActiveResume(null)
    }
  }

  useEffect(() => {
    if (!isEdit || !id) return
    void (async () => {
      setLoading(true)
      try {
        const student = await getStudent(id)
        if (!student) throw new Error('Student not found')
        setForm({
          rollNumber: student.roll_number,
          fullName: student.full_name,
          email: student.email,
          phone: student.phone,
          branch: student.branch,
          batch: student.batch,
          dateOfBirth: student.date_of_birth,
          cgpa: student.cgpa,
          activeBacklogs: student.active_backlogs,
          graduationYear: student.graduation_year,
          placementStatus: student.placement_status,
          linkedinUrl: student.linkedin_url,
          githubUrl: student.github_url,
          portfolioUrl: student.portfolio_url,
          skillsSummary: student.skills_summary,
          careerInterest: student.career_interest,
          platformHandles: (student.platform_handles ?? {}) as PlatformHandles,
          projectsSummary: student.projects_summary ?? '',
          isPlacementEligible: student.is_placement_eligible,
        })
        await loadResume(student.id)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load student')
      } finally {
        setLoading(false)
      }
    })()
  }, [id, isEdit])

  const set = (key: keyof CreateStudentInput, value: string | number | boolean | null | PlatformHandles) => {
    setForm((f) => ({ ...f, [key]: value }))
  }

  const setPlatformHandle = (platform: Platform, value: string) => {
    setForm((f) => ({
      ...f,
      platformHandles: { ...(f.platformHandles ?? {}), [platform]: value },
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!base) return
    setSaving(true)
    setError(null)
    try {
      if (isEdit && id) {
        await updateStudent(id, form)
        router.history.push(`${base}/students/${id}`)
      } else {
        const created = await createStudent(form)
        router.history.push(`${base}/students/${created.id}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !id || !canUploadResume) return
    setResumeUploading(true)
    setError(null)
    try {
      const uploaded = await uploadResume({
        studentProfileId: id,
        file,
        userId: user?.id ?? null,
      })
      setActiveResume(uploaded)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Resume upload failed')
    } finally {
      setResumeUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleResumeDownload = async () => {
    if (!activeResume) return
    try {
      const url = await getResumeDownloadUrl(activeResume.id)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Resume download failed')
    }
  }

  return (
    <PlacementShell title={isEdit ? 'Edit Student' : 'Add Student'}>
      <PlacementPageHeader
        title={isEdit ? 'Edit student' : 'Add student'}
        description="Create or update a placement student profile."
        actions={
          base ? (
            <Button asChild variant="outline" size="sm">
              <PlacementLink href={`${base}/students`}>Cancel</PlacementLink>
            </Button>
          ) : null
        }
      />

      {error ? <div className="mb-4"><PlacementErrorAlert message={error} /></div> : null}
      {loading ? <PlacementLoadingBlock /> : null}

      {!loading ? (
        <Card className="term-window border-border bg-card/80">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-base">Student information</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm">
                <span className="text-muted-foreground">Roll number *</span>
                <Input className="mt-1 border-border bg-card" required value={form.rollNumber} onChange={(e) => set('rollNumber', e.target.value)} />
              </label>
              <label className="text-sm">
                <span className="text-muted-foreground">Full name *</span>
                <Input className="mt-1 border-border bg-card" required value={form.fullName} onChange={(e) => set('fullName', e.target.value)} />
              </label>
              <label className="text-sm">
                <span className="text-muted-foreground">Email</span>
                <Input type="email" className="mt-1 border-border bg-card" value={form.email} onChange={(e) => set('email', e.target.value)} />
              </label>
              <label className="text-sm">
                <span className="text-muted-foreground">Phone</span>
                <Input className="mt-1 border-border bg-card" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
              </label>
              <label className="text-sm">
                <span className="text-muted-foreground">Branch</span>
                <Input className="mt-1 border-border bg-card" value={form.branch} onChange={(e) => set('branch', e.target.value)} />
              </label>
              <label className="text-sm">
                <span className="text-muted-foreground">Batch / year</span>
                <Input className="mt-1 border-border bg-card" value={form.batch} onChange={(e) => set('batch', e.target.value)} />
              </label>
              <label className="text-sm">
                <span className="text-muted-foreground">Date of birth</span>
                <Input type="date" className="mt-1 border-border bg-card" value={form.dateOfBirth ?? ''} onChange={(e) => set('dateOfBirth', e.target.value || null)} />
              </label>
              <label className="text-sm">
                <span className="text-muted-foreground">CGPA</span>
                <Input type="number" step="0.01" className="mt-1 border-border bg-card" value={form.cgpa ?? ''} onChange={(e) => set('cgpa', e.target.value ? Number(e.target.value) : null)} />
              </label>
              <label className="text-sm">
                <span className="text-muted-foreground">Active backlogs</span>
                <Input type="number" className="mt-1 border-border bg-card" value={form.activeBacklogs ?? 0} onChange={(e) => set('activeBacklogs', Number(e.target.value))} />
              </label>
              <label className="text-sm">
                <span className="text-muted-foreground">Placement status</span>
                <select className="mt-1 flex h-8 w-full rounded-lg term-window border-border bg-card/80 px-2.5 text-sm" value={form.placementStatus} onChange={(e) => set('placementStatus', e.target.value)}>
                  {PLACEMENT_STATUSES.map((s) => (
                    <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input type="checkbox" checked={form.isPlacementEligible ?? true} onChange={(e) => set('isPlacementEligible', e.target.checked)} />
                <span className="text-muted-foreground">Placement eligible</span>
              </label>
              <label className="text-sm sm:col-span-2">
                <span className="text-muted-foreground">Skills summary</span>
                <Input className="mt-1 border-border bg-card" value={form.skillsSummary} onChange={(e) => set('skillsSummary', e.target.value)} />
              </label>
              <label className="text-sm sm:col-span-2">
                <span className="text-muted-foreground">Career interest</span>
                <Input className="mt-1 border-border bg-card" value={form.careerInterest} onChange={(e) => set('careerInterest', e.target.value)} />
              </label>
              <label className="text-sm sm:col-span-2">
                <span className="text-muted-foreground">LinkedIn URL</span>
                <Input className="mt-1 border-border bg-card" value={form.linkedinUrl} onChange={(e) => set('linkedinUrl', e.target.value)} />
              </label>
              <label className="text-sm sm:col-span-2">
                <span className="text-muted-foreground">GitHub URL</span>
                <Input className="mt-1 border-border bg-card" value={form.githubUrl} onChange={(e) => set('githubUrl', e.target.value)} />
              </label>
              <label className="text-sm sm:col-span-2">
                <span className="text-muted-foreground">Portfolio URL</span>
                <Input className="mt-1 border-border bg-card" value={form.portfolioUrl} onChange={(e) => set('portfolioUrl', e.target.value)} />
              </label>
              {isEdit && canUploadResume ? (
                <div className="sm:col-span-2 rounded-lg border border-border bg-background/30 p-4">
                  <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Resume</p>
                  {activeResume ? (
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-card/60 px-3 py-2">
                      <div className="flex min-w-0 items-center gap-2 text-sm">
                        <FileText className="size-4 shrink-0 text-primary" />
                        <span className="truncate font-medium">{activeResume.file_name}</span>
                        <span className="font-mono text-xs text-muted-foreground">({activeResume.review_status})</span>
                      </div>
                      <Button type="button" size="sm" variant="outline" onClick={() => void handleResumeDownload()}>
                        <Download className="size-3.5" />
                        Download
                      </Button>
                    </div>
                  ) : (
                    <p className="mb-3 text-sm text-muted-foreground">No resume uploaded yet.</p>
                  )}
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    className="hidden"
                    onChange={handleResumeUpload}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={resumeUploading}
                    onClick={() => fileRef.current?.click()}
                  >
                    <Upload className="size-3.5" />
                    {resumeUploading ? 'Uploading…' : activeResume ? 'Replace resume' : 'Upload resume'}
                  </Button>
                  <p className="mt-2 text-xs text-muted-foreground">
                    PDF preferred. The active resume appears on the student profile, resume books, and readiness views.
                  </p>
                </div>
              ) : null}
              <div className="sm:col-span-2">
                <p className="mb-2 text-sm text-muted-foreground">Coding platform handles (for live trace)</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {ALL_PLATFORMS.map((platform) => (
                    <label key={platform} className="text-sm">
                      <span className="capitalize text-muted-foreground">{platform}</span>
                      <Input
                        className="mt-1 border-border bg-card font-mono text-xs"
                        placeholder="username"
                        value={form.platformHandles?.[platform] ?? ''}
                        onChange={(e) => setPlatformHandle(platform, e.target.value)}
                      />
                    </label>
                  ))}
                </div>
              </div>
              <label className="text-sm sm:col-span-2">
                <span className="text-muted-foreground">Projects summary</span>
                <textarea
                  className="mt-1 min-h-28 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                  value={form.projectsSummary ?? ''}
                  onChange={(e) => set('projectsSummary', e.target.value)}
                />
              </label>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={saving}>{saving ? 'Saving…' : isEdit ? 'Update student' : 'Create student'}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </PlacementShell>
  )
}
