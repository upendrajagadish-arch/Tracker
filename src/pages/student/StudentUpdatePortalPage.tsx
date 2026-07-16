import { useEffect, useState, type FormEvent } from 'react'
import { useParams } from '@tanstack/react-router'
import { SeoHead } from '@/components/SeoHead'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { PlacementLoadingBlock } from '@/components/placement/PlacementStates'
import {
  getPublicStudentUpdateForm,
  submitPublicStudentUpdate,
  uploadPublicCampaignResume,
  type PublicUpdateForm,
} from '@/api/placement/studentUpdateCampaigns'
import { BRAND_NAME } from '@/lib/brand'

export function StudentUpdatePortalPage() {
  const { token } = useParams({ strict: false }) as { token: string }
  const [form, setForm] = useState<PublicUpdateForm | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [resumeFile, setResumeFile] = useState<File | null>(null)

  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [projectsSummary, setProjectsSummary] = useState('')
  const [certificationsSummary, setCertificationsSummary] = useState('')
  const [internshipSummary, setInternshipSummary] = useState('')
  const [skillsSummary, setSkillsSummary] = useState('')
  const [portfolioUrl, setPortfolioUrl] = useState('')
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [githubUrl, setGithubUrl] = useState('')
  const [careerInterest, setCareerInterest] = useState('')
  const [githubHandle, setGithubHandle] = useState('')

  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex,nofollow'
    document.head.appendChild(meta)
    return () => {
      document.head.removeChild(meta)
    }
  }, [])

  useEffect(() => {
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await getPublicStudentUpdateForm(token)
        if (!data) {
          setError('This update link is invalid, expired, or has been turned off.')
          return
        }
        setForm(data)
        setPhone(data.editable.phone)
        setAddress(data.editable.address)
        setProjectsSummary(data.editable.projectsSummary)
        setCertificationsSummary(data.editable.certificationsSummary)
        setInternshipSummary(data.editable.internshipSummary)
        setSkillsSummary(data.editable.skillsSummary)
        setPortfolioUrl(data.editable.portfolioUrl)
        setLinkedinUrl(data.editable.linkedinUrl)
        setGithubUrl(data.editable.githubUrl)
        setCareerInterest(data.editable.careerInterest)
        setGithubHandle(String(data.editable.platformHandles?.github ?? ''))
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load update form')
      } finally {
        setLoading(false)
      }
    })()
  }, [token])

  const allowed = (field: string) =>
    !form?.allowlistedFields?.length || form.allowlistedFields.includes(field)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!form) return
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const payload: Record<string, unknown> = {}
      if (allowed('phone')) payload.phone = phone
      if (allowed('address')) payload.address = address
      if (allowed('projects_summary')) payload.projectsSummary = projectsSummary
      if (allowed('certifications_summary')) payload.certificationsSummary = certificationsSummary
      if (allowed('internship_summary')) payload.internshipSummary = internshipSummary
      if (allowed('skills_summary')) payload.skillsSummary = skillsSummary
      if (allowed('portfolio_url')) payload.portfolioUrl = portfolioUrl
      if (allowed('linkedin_url')) payload.linkedinUrl = linkedinUrl
      if (allowed('github_url')) payload.githubUrl = githubUrl
      if (allowed('career_interest')) payload.careerInterest = careerInterest
      if (allowed('platform_handles')) {
        payload.platformHandles = {
          ...form.editable.platformHandles,
          github: githubHandle.trim(),
        }
      }

      const result = await submitPublicStudentUpdate(token, payload)
      if (!result.ok) throw new Error(result.error || 'Update failed')

      if (resumeFile) {
        await uploadPublicCampaignResume(token, resumeFile)
      }

      setSuccess('Your placement profile was updated successfully. You can close this page.')
      setResumeFile(null)
      const refreshed = await getPublicStudentUpdateForm(token)
      if (refreshed) setForm(refreshed)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save updates')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-16">
        <PlacementLoadingBlock label="Loading your update form…" />
      </div>
    )
  }

  if (error && !form) {
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

  if (!form) return null

  return (
    <>
      <SeoHead
        title={`${form.campaignTitle} · ${BRAND_NAME}`}
        description="Secure student placement profile update"
      />
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
        <div className="mb-6 rounded-card border border-soft bg-card p-5 sm:p-6">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-muted">{BRAND_NAME}</p>
          <h1 className="mt-2 font-heading text-[28px] font-bold tracking-tight">{form.campaignTitle}</h1>
          {form.campaignDescription ? (
            <p className="mt-2 text-[14px] text-secondary">{form.campaignDescription}</p>
          ) : null}
          <p className="mt-3 text-[12px] text-muted">
            This is a secure placement registration form. Locked academic fields cannot be changed.
            {form.expiresAt ? ` Link expires ${new Date(form.expiresAt).toLocaleString()}.` : ''}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Card>
            <CardContent className="space-y-3 pt-1">
              <h2 className="font-heading text-lg font-bold">Locked academic details</h2>
              <div className="grid gap-3 sm:grid-cols-2 text-[14px]">
                <LockedField label="Name" value={form.locked.fullName} />
                <LockedField label="Roll number" value={form.locked.rollNumber} />
                <LockedField label="Branch / Department" value={form.locked.branch} />
                <LockedField label="Section" value={form.locked.section || '—'} />
                <LockedField label="Academic Batch" value={form.locked.academicBatch || '—'} />
                <LockedField label="Email" value={form.locked.email || '—'} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 pt-1">
              <h2 className="font-heading text-lg font-bold">Complete your profile</h2>
              {allowed('phone') ? (
                <Field label="Phone">
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
                </Field>
              ) : null}
              {allowed('address') ? (
                <Field label="Address">
                  <Input value={address} onChange={(e) => setAddress(e.target.value)} />
                </Field>
              ) : null}
              {allowed('linkedin_url') ? (
                <Field label="LinkedIn URL">
                  <Input value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} />
                </Field>
              ) : null}
              {allowed('github_url') ? (
                <Field label="GitHub URL">
                  <Input value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} />
                </Field>
              ) : null}
              {allowed('platform_handles') ? (
                <Field label="GitHub username">
                  <Input value={githubHandle} onChange={(e) => setGithubHandle(e.target.value)} />
                </Field>
              ) : null}
              {allowed('portfolio_url') ? (
                <Field label="Portfolio URL">
                  <Input value={portfolioUrl} onChange={(e) => setPortfolioUrl(e.target.value)} />
                </Field>
              ) : null}
              {allowed('career_interest') ? (
                <Field label="Career interests">
                  <Input value={careerInterest} onChange={(e) => setCareerInterest(e.target.value)} />
                </Field>
              ) : null}
              {allowed('skills_summary') ? (
                <Field label="Skills">
                  <Input value={skillsSummary} onChange={(e) => setSkillsSummary(e.target.value)} />
                </Field>
              ) : null}
              {allowed('projects_summary') ? (
                <Field label="Projects">
                  <Input value={projectsSummary} onChange={(e) => setProjectsSummary(e.target.value)} />
                </Field>
              ) : null}
              {allowed('certifications_summary') ? (
                <Field label="Certifications">
                  <Input value={certificationsSummary} onChange={(e) => setCertificationsSummary(e.target.value)} />
                </Field>
              ) : null}
              {allowed('internship_summary') ? (
                <Field label="Internship">
                  <Input value={internshipSummary} onChange={(e) => setInternshipSummary(e.target.value)} />
                </Field>
              ) : null}
              <Field label={`Resume${form.resumeFileName ? ` (current: ${form.resumeFileName})` : ''}`}>
                <Input
                  type="file"
                  accept=".pdf,.doc,.docx,application/pdf"
                  onChange={(e) => setResumeFile(e.target.files?.[0] ?? null)}
                />
              </Field>
            </CardContent>
          </Card>

          {error ? <p className="text-[14px] font-semibold text-[#F6465D]">{error}</p> : null}
          {success ? <p className="text-[14px] font-semibold text-[#0ECB81]">{success}</p> : null}

          <Button type="submit" disabled={saving} size="lg">
            {saving ? 'Saving…' : form.submittedAt ? 'Update again' : 'Submit profile update'}
          </Button>
        </form>
      </div>
    </>
  )
}

function LockedField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-button border border-soft bg-[#181A20] px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 font-medium text-foreground">{value}</p>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-[14px]">
      <span className="font-semibold text-foreground">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  )
}
