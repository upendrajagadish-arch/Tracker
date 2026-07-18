import { useEffect, useState, type FormEvent } from 'react'
import { useParams } from '@tanstack/react-router'
import { SeoHead } from '@/components/SeoHead'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PlacementLoadingBlock } from '@/components/placement/PlacementStates'
import { ALL_PLATFORMS } from '@/api/unifiedClient'
import type { Platform } from '@/types/api'
import {
  getPublicCampaignRegistrationForm,
  getPublicStudentUpdateForm,
  submitPublicCampaignRegistration,
  submitPublicStudentUpdate,
  uploadPublicCampaignRegistrationResume,
  uploadPublicCampaignResume,
  type PublicRegistrationForm,
  type PublicUpdateForm,
} from '@/api/placement/studentUpdateCampaigns'
import { BRAND_NAME } from '@/lib/brand'

type RegistrationForm = {
  rollNumber: string
  fullName: string
  email: string
  phone: string
  branch: string
  batch: string
  dateOfBirth: string | null
  cgpa: number | null
  activeBacklogs: number
  linkedinUrl: string
  githubUrl: string
  portfolioUrl: string
  skillsSummary: string
  careerInterest: string
  platformHandles: Record<string, string>
  projectsSummary: string
}

const emptyRegistrationForm: RegistrationForm = {
  rollNumber: '',
  fullName: '',
  email: '',
  phone: '',
  branch: '',
  batch: '',
  dateOfBirth: null,
  cgpa: null,
  activeBacklogs: 0,
  linkedinUrl: '',
  githubUrl: '',
  portfolioUrl: '',
  skillsSummary: '',
  careerInterest: '',
  platformHandles: {},
  projectsSummary: '',
}

function RegistrationFields({
  form,
  set,
  setPlatformHandle,
  setResumeFile,
  fileInputKey = 0,
  allowedFields,
}: {
  form: RegistrationForm
  set: (key: keyof RegistrationForm, value: RegistrationForm[keyof RegistrationForm]) => void
  setPlatformHandle: (platform: Platform, value: string) => void
  setResumeFile: (file: File | null) => void
  fileInputKey?: number
  allowedFields?: string[]
}) {
  const fieldClass = (field: string, base = 'text-sm') =>
    `${base} ${allowedFields?.length && !allowedFields.includes(field) ? 'hidden' : ''}`
  return (
    <>
      <label className={fieldClass('email')}>
        <span className="text-muted-foreground">Roll number *</span>
        <Input className="mt-1 border-border bg-card" required value={form.rollNumber} onChange={(e) => set('rollNumber', e.target.value)} />
      </label>
      <label className={fieldClass('phone')}>
        <span className="text-muted-foreground">Full name *</span>
        <Input className="mt-1 border-border bg-card" required value={form.fullName} onChange={(e) => set('fullName', e.target.value)} />
      </label>
      <label className={fieldClass('branch')}>
        <span className="text-muted-foreground">Email</span>
        <Input type="email" className="mt-1 border-border bg-card" value={form.email} onChange={(e) => set('email', e.target.value)} />
      </label>
      <label className={fieldClass('academic_batch')}>
        <span className="text-muted-foreground">Phone</span>
        <Input className="mt-1 border-border bg-card" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
      </label>
      <label className={fieldClass('date_of_birth')}>
        <span className="text-muted-foreground">Branch</span>
        <Input className="mt-1 border-border bg-card" value={form.branch} onChange={(e) => set('branch', e.target.value)} />
      </label>
      <label className={fieldClass('cgpa')}>
        <span className="text-muted-foreground">Academic Batch</span>
        <Input className="mt-1 border-border bg-card" value={form.batch} onChange={(e) => set('batch', e.target.value)} />
      </label>
      <label className={fieldClass('active_backlogs')}>
        <span className="text-muted-foreground">Date of birth</span>
        <Input type="date" className="mt-1 border-border bg-card" value={form.dateOfBirth ?? ''} onChange={(e) => set('dateOfBirth', e.target.value || null)} />
      </label>
      <label className="text-sm">
        <span className="text-muted-foreground">CGPA</span>
        <Input type="number" step="0.01" className="mt-1 border-border bg-card" value={form.cgpa ?? ''} onChange={(e) => set('cgpa', e.target.value ? Number(e.target.value) : null)} />
      </label>
      <label className="text-sm">
        <span className="text-muted-foreground">Active backlogs</span>
        <Input type="number" className="mt-1 border-border bg-card" value={form.activeBacklogs} onChange={(e) => set('activeBacklogs', Number(e.target.value))} />
      </label>
      <label className={fieldClass('skills_summary', 'text-sm sm:col-span-2')}>
        <span className="text-muted-foreground">Skills summary</span>
        <Input className="mt-1 border-border bg-card" value={form.skillsSummary} onChange={(e) => set('skillsSummary', e.target.value)} />
      </label>
      <label className={fieldClass('career_interest', 'text-sm sm:col-span-2')}>
        <span className="text-muted-foreground">Career interest</span>
        <Input className="mt-1 border-border bg-card" value={form.careerInterest} onChange={(e) => set('careerInterest', e.target.value)} />
      </label>
      <label className={fieldClass('linkedin_url', 'text-sm sm:col-span-2')}>
        <span className="text-muted-foreground">LinkedIn URL</span>
        <Input className="mt-1 border-border bg-card" value={form.linkedinUrl} onChange={(e) => set('linkedinUrl', e.target.value)} />
      </label>
      <label className={fieldClass('github_url', 'text-sm sm:col-span-2')}>
        <span className="text-muted-foreground">GitHub URL</span>
        <Input className="mt-1 border-border bg-card" value={form.githubUrl} onChange={(e) => set('githubUrl', e.target.value)} />
      </label>
      <label className={fieldClass('portfolio_url', 'text-sm sm:col-span-2')}>
        <span className="text-muted-foreground">Portfolio URL</span>
        <Input className="mt-1 border-border bg-card" value={form.portfolioUrl} onChange={(e) => set('portfolioUrl', e.target.value)} />
      </label>
      <div className="sm:col-span-2 rounded-lg border border-border bg-background/30 p-4">
        <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Resume</p>
        <Input key={fileInputKey} type="file" accept=".pdf,.doc,.docx,application/pdf" onChange={(e) => setResumeFile(e.target.files?.[0] ?? null)} />
        <p className="mt-2 text-xs text-muted-foreground">PDF preferred. Upload your resume with the registration form.</p>
      </div>
      <div className={fieldClass('platform_handles', 'sm:col-span-2')}>
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
      <label className={fieldClass('projects_summary', 'text-sm sm:col-span-2')}>
        <span className="text-muted-foreground">Projects summary</span>
        <textarea
          className="mt-1 min-h-28 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
          value={form.projectsSummary}
          onChange={(e) => set('projectsSummary', e.target.value)}
        />
      </label>
    </>
  )
}

function CampaignRegistrationPortal({ campaignId }: { campaignId: string }) {
  const [meta, setMeta] = useState<PublicRegistrationForm | null>(null)
  const [form, setForm] = useState<RegistrationForm>(emptyRegistrationForm)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [fileInputKey, setFileInputKey] = useState(0)
  const [registeredStudentId, setRegisteredStudentId] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await getPublicCampaignRegistrationForm(campaignId)
        if (!active) return
        if (!data) {
          setError('This registration link is invalid, expired, or has been turned off.')
          return
        }
        setMeta(data)
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : 'Failed to load registration form')
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [campaignId])

  const set = (key: keyof RegistrationForm, value: RegistrationForm[keyof RegistrationForm]) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const setPlatformHandle = (platform: Platform, value: string) => {
    setForm((current) => ({
      ...current,
      platformHandles: { ...current.platformHandles, [platform]: value },
    }))
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!meta) return
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      if (registeredStudentId) {
        if (!resumeFile) {
          setError('Choose the resume file again to retry the upload.')
          return
        }
        await uploadPublicCampaignRegistrationResume(campaignId, registeredStudentId, resumeFile)
        setSuccess('Resume uploaded successfully. Your registration is complete.')
        setRegisteredStudentId(null)
        setResumeFile(null)
        setFileInputKey((key) => key + 1)
        return
      }
      const result = await submitPublicCampaignRegistration(campaignId, {
        rollNumber: form.rollNumber.trim(),
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone,
        branch: form.branch,
        batch: form.batch,
        academicBatch: form.batch,
        dateOfBirth: form.dateOfBirth,
        cgpa: form.cgpa,
        activeBacklogs: form.activeBacklogs,
        linkedinUrl: form.linkedinUrl,
        githubUrl: form.githubUrl,
        portfolioUrl: form.portfolioUrl,
        skillsSummary: form.skillsSummary,
        careerInterest: form.careerInterest,
        platformHandles: form.platformHandles,
        projectsSummary: form.projectsSummary,
      })
      if (!result.ok) throw new Error(result.error || 'Registration failed')
      if (!result.studentProfileId) throw new Error('Registration succeeded but student id was missing')

      if (resumeFile) {
        try {
          await uploadPublicCampaignRegistrationResume(campaignId, result.studentProfileId, resumeFile)
        } catch (resumeError) {
          setRegisteredStudentId(result.studentProfileId)
          setError(
            `Your profile was registered, but resume upload failed: ${
              resumeError instanceof Error ? resumeError.message : 'unknown error'
            }. Keep this page open and submit again to retry only the resume upload.`,
          )
          return
        }
      }

      setSuccess('Registration successful. Your profile and resume (if uploaded) are now in the placement application.')
      setForm(emptyRegistrationForm)
      setResumeFile(null)
      setFileInputKey((key) => key + 1)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to register')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-16">
        <PlacementLoadingBlock label="Loading registration form…" />
      </div>
    )
  }

  if (error && !meta) {
    return (
      <>
        <SeoHead title="Registration unavailable" />
        <div className="flex flex-1 items-center justify-center p-6">
          <Card className="max-w-md">
            <CardContent className="py-8 text-center">
              <h1 className="font-heading text-xl font-bold">Registration unavailable</h1>
              <p className="mt-2 text-sm text-secondary">{error}</p>
            </CardContent>
          </Card>
        </div>
      </>
    )
  }

  if (!meta) return null

  return (
    <>
      <SeoHead title={`${meta.campaignTitle} · ${BRAND_NAME}`} description="Student placement registration" />
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
        <div className="mb-6">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-muted">{BRAND_NAME}</p>
          <h1 className="mt-2 font-heading text-[28px] font-bold tracking-tight">{meta.campaignTitle}</h1>
          <p className="mt-2 text-[14px] text-secondary">
            {meta.campaignDescription || 'Fill in your details below to register. Your profile will appear in the placement application automatically.'}
          </p>
          {meta.expiresAt ? (
            <p className="mt-2 text-[12px] text-muted">Link expires {new Date(meta.expiresAt).toLocaleString()}.</p>
          ) : null}
        </div>

        <Card className="term-window border-border bg-card/80">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-base">Student registration</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
              <RegistrationFields
                form={form}
                set={set}
                setPlatformHandle={setPlatformHandle}
                setResumeFile={setResumeFile}
                fileInputKey={fileInputKey}
                allowedFields={meta.allowlistedFields}
              />
              {error ? <p className="text-[14px] font-semibold text-[#F6465D] sm:col-span-2">{error}</p> : null}
              {success ? <p className="text-[14px] font-semibold text-[#0ECB81] sm:col-span-2">{success}</p> : null}
              <div className="sm:col-span-2">
                <Button type="submit" disabled={saving}>
                  {saving ? 'Submitting…' : 'Register'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  )
}

function LegacyTokenUpdatePortal({ token }: { token: string }) {
  const [meta, setMeta] = useState<Pick<PublicUpdateForm, 'campaignTitle' | 'campaignDescription' | 'expiresAt' | 'submittedAt' | 'resumeFileName' | 'allowlistedFields'> | null>(null)
  const [form, setForm] = useState<RegistrationForm>(emptyRegistrationForm)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [fileInputKey, setFileInputKey] = useState(0)

  useEffect(() => {
    let active = true
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await getPublicStudentUpdateForm(token)
        if (!active) return
        if (!data) {
          setError('This update link is invalid, expired, or has been turned off.')
          return
        }
        setMeta({
          campaignTitle: data.campaignTitle,
          campaignDescription: data.campaignDescription,
          expiresAt: data.expiresAt,
          submittedAt: data.submittedAt,
          resumeFileName: data.resumeFileName,
          allowlistedFields: data.allowlistedFields,
        })
        setForm({
          rollNumber: data.editable.rollNumber,
          fullName: data.editable.fullName,
          email: data.editable.email,
          phone: data.editable.phone,
          branch: data.editable.branch,
          batch: data.editable.batch,
          dateOfBirth: data.editable.dateOfBirth,
          cgpa: data.editable.cgpa,
          activeBacklogs: data.editable.activeBacklogs,
          linkedinUrl: data.editable.linkedinUrl,
          githubUrl: data.editable.githubUrl,
          portfolioUrl: data.editable.portfolioUrl,
          skillsSummary: data.editable.skillsSummary,
          careerInterest: data.editable.careerInterest,
          platformHandles: data.editable.platformHandles,
          projectsSummary: data.editable.projectsSummary,
        })
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : 'Failed to load update form')
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [token])

  const set = (key: keyof RegistrationForm, value: RegistrationForm[keyof RegistrationForm]) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const setPlatformHandle = (platform: Platform, value: string) => {
    setForm((current) => ({
      ...current,
      platformHandles: { ...current.platformHandles, [platform]: value },
    }))
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!meta) return
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const result = await submitPublicStudentUpdate(token, form)
      if (!result.ok) throw new Error(result.error || 'Update failed')
      if (resumeFile) await uploadPublicCampaignResume(token, resumeFile)
      setSuccess('Your profile was updated successfully.')
      setResumeFile(null)
      setFileInputKey((key) => key + 1)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save updates')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-16">
        <PlacementLoadingBlock label="Loading your profile form…" />
      </div>
    )
  }

  if (error && !meta) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <Card className="max-w-md">
          <CardContent className="py-8 text-center">
            <h1 className="font-heading text-xl font-bold">Update link unavailable</h1>
            <p className="mt-2 text-sm text-secondary">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!meta) return null

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
      <Card>
        <CardHeader><CardTitle>{meta.campaignTitle}</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <RegistrationFields
              form={form}
              set={set}
              setPlatformHandle={setPlatformHandle}
              setResumeFile={setResumeFile}
              fileInputKey={fileInputKey}
              allowedFields={meta.allowlistedFields}
            />
            {error ? <p className="text-[14px] font-semibold text-[#F6465D] sm:col-span-2">{error}</p> : null}
            {success ? <p className="text-[14px] font-semibold text-[#0ECB81] sm:col-span-2">{success}</p> : null}
            <div className="sm:col-span-2">
              <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save profile'}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export function StudentUpdatePortalPage() {
  const { token, campaignId } = useParams({ strict: false }) as { token?: string; campaignId?: string }

  useEffect(() => {
    const robots = document.createElement('meta')
    robots.name = 'robots'
    robots.content = 'noindex,nofollow'
    document.head.appendChild(robots)
    return () => {
      document.head.removeChild(robots)
    }
  }, [])

  if (campaignId) return <CampaignRegistrationPortal campaignId={campaignId} />
  if (token) return <LegacyTokenUpdatePortal token={token} />

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <Card className="max-w-md">
        <CardContent className="py-8 text-center">
          <h1 className="font-heading text-xl font-bold">Invalid link</h1>
          <p className="mt-2 text-sm text-secondary">This registration link is not valid.</p>
        </CardContent>
      </Card>
    </div>
  )
}
