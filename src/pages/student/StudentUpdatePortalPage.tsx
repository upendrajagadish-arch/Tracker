import { useEffect, useState, type FormEvent } from 'react'
import { useParams } from '@tanstack/react-router'
import { SeoHead } from '@/components/SeoHead'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PlacementLoadingBlock } from '@/components/placement/PlacementStates'
import { PLACEMENT_STATUSES } from '@/components/placement/PlacementBadges'
import { ALL_PLATFORMS } from '@/api/unifiedClient'
import type { Platform } from '@/types/api'
import {
  getPublicStudentUpdateForm,
  resolveCampaignStudentToken,
  submitPublicStudentUpdate,
  uploadPublicCampaignResume,
  type PublicUpdateForm,
} from '@/api/placement/studentUpdateCampaigns'
import { BRAND_NAME } from '@/lib/brand'

type EditableForm = PublicUpdateForm['editable']

const emptyEditable: EditableForm = {
  rollNumber: '',
  fullName: '',
  email: '',
  phone: '',
  branch: '',
  batch: '',
  dateOfBirth: null,
  cgpa: null,
  activeBacklogs: 0,
  placementStatus: 'NOT_STARTED',
  isPlacementEligible: true,
  linkedinUrl: '',
  githubUrl: '',
  portfolioUrl: '',
  skillsSummary: '',
  careerInterest: '',
  platformHandles: {},
  projectsSummary: '',
}

export function StudentUpdatePortalPage() {
  const { token, campaignId } = useParams({ strict: false }) as { token?: string; campaignId?: string }
  const [activeToken, setActiveToken] = useState<string | null>(token ?? null)
  const [rollNumber, setRollNumber] = useState('')
  const [resolving, setResolving] = useState(false)
  const [meta, setMeta] = useState<Pick<
    PublicUpdateForm,
    'campaignTitle' | 'campaignDescription' | 'expiresAt' | 'submittedAt' | 'resumeFileName'
  > | null>(null)
  const [form, setForm] = useState<EditableForm>(emptyEditable)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [resumeFile, setResumeFile] = useState<File | null>(null)

  useEffect(() => {
    const robots = document.createElement('meta')
    robots.name = 'robots'
    robots.content = 'noindex,nofollow'
    document.head.appendChild(robots)
    return () => {
      document.head.removeChild(robots)
    }
  }, [])

  useEffect(() => {
    setActiveToken(token ?? null)
  }, [token])

  useEffect(() => {
    if (!activeToken) {
      setLoading(false)
      return
    }
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await getPublicStudentUpdateForm(activeToken)
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
        })
        setForm(data.editable)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load update form')
      } finally {
        setLoading(false)
      }
    })()
  }, [activeToken])

  const set = (key: keyof EditableForm, value: EditableForm[keyof EditableForm]) => {
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
      if (!activeToken) return
      const result = await submitPublicStudentUpdate(activeToken, {
        rollNumber: form.rollNumber,
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        branch: form.branch,
        batch: form.batch,
        academicBatch: form.batch,
        dateOfBirth: form.dateOfBirth,
        cgpa: form.cgpa,
        activeBacklogs: form.activeBacklogs,
        placementStatus: form.placementStatus,
        isPlacementEligible: form.isPlacementEligible,
        linkedinUrl: form.linkedinUrl,
        githubUrl: form.githubUrl,
        portfolioUrl: form.portfolioUrl,
        skillsSummary: form.skillsSummary,
        careerInterest: form.careerInterest,
        platformHandles: form.platformHandles,
        projectsSummary: form.projectsSummary,
      })
      if (!result.ok) throw new Error(result.error || 'Update failed')

      if (resumeFile) {
        await uploadPublicCampaignResume(activeToken, resumeFile)
      }

      setSuccess('Your profile was updated successfully. Changes are now visible in the placement application.')
      setResumeFile(null)
      const refreshed = await getPublicStudentUpdateForm(activeToken)
      if (refreshed) {
        setMeta({
          campaignTitle: refreshed.campaignTitle,
          campaignDescription: refreshed.campaignDescription,
          expiresAt: refreshed.expiresAt,
          submittedAt: refreshed.submittedAt,
          resumeFileName: refreshed.resumeFileName,
        })
        setForm(refreshed.editable)
      }
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

  const handleResolveSharedLink = async (event: FormEvent) => {
    event.preventDefault()
    if (!campaignId || !rollNumber.trim()) return
    setResolving(true)
    setError(null)
    try {
      const resolvedToken = await resolveCampaignStudentToken(campaignId, rollNumber)
      if (!resolvedToken) {
        setError('Student not found in this campaign. Check roll number and try again.')
        return
      }
      setActiveToken(resolvedToken)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to open profile')
    } finally {
      setResolving(false)
    }
  }

  if (!activeToken && campaignId) {
    return (
      <>
        <SeoHead title={`Student Profile Update · ${BRAND_NAME}`} description="Open your student edit profile form" />
        <div className="mx-auto flex w-full max-w-xl flex-1 items-center justify-center px-4 py-10">
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Open your profile form</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleResolveSharedLink} className="space-y-4">
                <p className="text-sm text-secondary">
                  Enter your roll number to open your edit-profile form.
                </p>
                <label className="block text-sm">
                  <span className="text-muted-foreground">Roll number</span>
                  <Input
                    className="mt-1"
                    required
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                    placeholder="e.g. 23CSE001"
                  />
                </label>
                {error ? <p className="text-[14px] font-semibold text-[#F6465D]">{error}</p> : null}
                <Button type="submit" disabled={resolving}>
                  {resolving ? 'Opening…' : 'Open profile'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </>
    )
  }

  if (error && !meta) {
    return (
      <>
        <SeoHead title="Update link unavailable" />
        <div className="flex flex-1 items-center justify-center p-6">
          <Card className="max-w-md">
            <CardContent className="py-8 text-center">
              <h1 className="font-heading text-xl font-bold">Update link unavailable</h1>
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
      <SeoHead
        title={`${meta.campaignTitle} · ${BRAND_NAME}`}
        description="Edit your placement student profile"
      />
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
        <div className="mb-6">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-muted">{BRAND_NAME}</p>
          <h1 className="mt-2 font-heading text-[28px] font-bold tracking-tight">{meta.campaignTitle}</h1>
          {meta.campaignDescription ? (
            <p className="mt-2 text-[14px] text-secondary">{meta.campaignDescription}</p>
          ) : (
            <p className="mt-2 text-[14px] text-secondary">
              Update your student profile and click Save. Your details will appear in the placement application automatically.
            </p>
          )}
          {meta.expiresAt ? (
            <p className="mt-2 text-[12px] text-muted">
              Link expires {new Date(meta.expiresAt).toLocaleString()}.
            </p>
          ) : null}
        </div>

        <Card className="term-window border-border bg-card/80">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-base">Student information</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm">
                <span className="text-muted-foreground">Roll number *</span>
                <Input
                  className="mt-1 border-border bg-card"
                  required
                  value={form.rollNumber}
                  onChange={(e) => set('rollNumber', e.target.value)}
                />
              </label>
              <label className="text-sm">
                <span className="text-muted-foreground">Full name *</span>
                <Input
                  className="mt-1 border-border bg-card"
                  required
                  value={form.fullName}
                  onChange={(e) => set('fullName', e.target.value)}
                />
              </label>
              <label className="text-sm">
                <span className="text-muted-foreground">Email</span>
                <Input
                  type="email"
                  className="mt-1 border-border bg-card"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                />
              </label>
              <label className="text-sm">
                <span className="text-muted-foreground">Phone</span>
                <Input
                  className="mt-1 border-border bg-card"
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value)}
                />
              </label>
              <label className="text-sm">
                <span className="text-muted-foreground">Branch</span>
                <Input
                  className="mt-1 border-border bg-card"
                  value={form.branch}
                  onChange={(e) => set('branch', e.target.value)}
                />
              </label>
              <label className="text-sm">
                <span className="text-muted-foreground">Academic Batch</span>
                <Input
                  className="mt-1 border-border bg-card"
                  value={form.batch}
                  onChange={(e) => set('batch', e.target.value)}
                />
              </label>
              <label className="text-sm">
                <span className="text-muted-foreground">Date of birth</span>
                <Input
                  type="date"
                  className="mt-1 border-border bg-card"
                  value={form.dateOfBirth ?? ''}
                  onChange={(e) => set('dateOfBirth', e.target.value || null)}
                />
              </label>
              <label className="text-sm">
                <span className="text-muted-foreground">CGPA</span>
                <Input
                  type="number"
                  step="0.01"
                  className="mt-1 border-border bg-card"
                  value={form.cgpa ?? ''}
                  onChange={(e) => set('cgpa', e.target.value ? Number(e.target.value) : null)}
                />
              </label>
              <label className="text-sm">
                <span className="text-muted-foreground">Active backlogs</span>
                <Input
                  type="number"
                  className="mt-1 border-border bg-card"
                  value={form.activeBacklogs}
                  onChange={(e) => set('activeBacklogs', Number(e.target.value))}
                />
              </label>
              <label className="text-sm">
                <span className="text-muted-foreground">Placement status</span>
                <select
                  className="mt-1 flex h-8 w-full rounded-lg term-window border-border bg-card/80 px-2.5 text-sm"
                  value={form.placementStatus}
                  onChange={(e) => set('placementStatus', e.target.value)}
                >
                  {PLACEMENT_STATUSES.map((status) => (
                    <option key={status} value={status}>{status.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input
                  type="checkbox"
                  checked={form.isPlacementEligible}
                  onChange={(e) => set('isPlacementEligible', e.target.checked)}
                />
                <span className="text-muted-foreground">Placement eligible</span>
              </label>
              <label className="text-sm sm:col-span-2">
                <span className="text-muted-foreground">Skills summary</span>
                <Input
                  className="mt-1 border-border bg-card"
                  value={form.skillsSummary}
                  onChange={(e) => set('skillsSummary', e.target.value)}
                />
              </label>
              <label className="text-sm sm:col-span-2">
                <span className="text-muted-foreground">Career interest</span>
                <Input
                  className="mt-1 border-border bg-card"
                  value={form.careerInterest}
                  onChange={(e) => set('careerInterest', e.target.value)}
                />
              </label>
              <label className="text-sm sm:col-span-2">
                <span className="text-muted-foreground">LinkedIn URL</span>
                <Input
                  className="mt-1 border-border bg-card"
                  value={form.linkedinUrl}
                  onChange={(e) => set('linkedinUrl', e.target.value)}
                />
              </label>
              <label className="text-sm sm:col-span-2">
                <span className="text-muted-foreground">GitHub URL</span>
                <Input
                  className="mt-1 border-border bg-card"
                  value={form.githubUrl}
                  onChange={(e) => set('githubUrl', e.target.value)}
                />
              </label>
              <label className="text-sm sm:col-span-2">
                <span className="text-muted-foreground">Portfolio URL</span>
                <Input
                  className="mt-1 border-border bg-card"
                  value={form.portfolioUrl}
                  onChange={(e) => set('portfolioUrl', e.target.value)}
                />
              </label>

              <div className="sm:col-span-2 rounded-lg border border-border bg-background/30 p-4">
                <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Resume</p>
                {meta.resumeFileName ? (
                  <p className="mb-3 text-sm">
                    Current resume: <span className="font-medium">{meta.resumeFileName}</span>
                  </p>
                ) : (
                  <p className="mb-3 text-sm text-muted-foreground">No resume uploaded yet.</p>
                )}
                <Input
                  type="file"
                  accept=".pdf,.doc,.docx,application/pdf"
                  onChange={(e) => setResumeFile(e.target.files?.[0] ?? null)}
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  PDF preferred. After you save, the resume appears on your student profile.
                </p>
              </div>

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
                  value={form.projectsSummary}
                  onChange={(e) => set('projectsSummary', e.target.value)}
                />
              </label>

              {error ? <p className="text-[14px] font-semibold text-[#F6465D] sm:col-span-2">{error}</p> : null}
              {success ? <p className="text-[14px] font-semibold text-[#0ECB81] sm:col-span-2">{success}</p> : null}

              <div className="sm:col-span-2">
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving…' : meta.submittedAt ? 'Update profile' : 'Save profile'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
