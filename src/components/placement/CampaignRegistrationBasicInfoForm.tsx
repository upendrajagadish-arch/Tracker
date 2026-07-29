import {
  Briefcase,
  CalendarIcon,
  FileText,
  GraduationCap,
  Link2,
  Mail,
  Phone,
  User,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CertificationsListField } from '@/components/placement/CertificationsListField'
import { RegistrationSuccessPopup } from '@/components/placement/RegistrationSuccessPopup'
import { ALL_PLATFORMS } from '@/api/unifiedClient'
import type { Platform } from '@/types/api'
import { BRAND_NAME } from '@/lib/brand'
import { cn } from '@/lib/utils'

export type CampaignRegistrationValues = {
  rollNumber: string
  fullName: string
  email: string
  phone: string
  branch: string
  batch: string
  trainingProgram: string
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
  certificationsSummary: string
}

type Props = {
  title: string
  description?: string
  expiresAt?: string | null
  form: CampaignRegistrationValues
  set: (
    key: keyof CampaignRegistrationValues,
    value: CampaignRegistrationValues[keyof CampaignRegistrationValues],
  ) => void
  setPlatformHandle: (platform: Platform, value: string) => void
  setResumeFile: (file: File | null) => void
  fileInputKey?: number
  allowedFields?: string[]
  saving?: boolean
  error?: string | null
  success?: string | null
  onDismissSuccess?: () => void
  submitLabel?: string
  onSubmit: (event: React.FormEvent) => void
}

const selectClassName =
  'flex h-10 w-full rounded-input border border-soft bg-[#0B0E11] px-3 text-[14px] font-medium text-foreground outline-none focus-visible:border-[#3B82F6] focus-visible:ring-2 focus-visible:ring-[#3B82F6]/35'

function FieldShell({
  show,
  className,
  children,
}: {
  show: boolean
  className?: string
  children: React.ReactNode
}) {
  if (!show) return null
  return <div className={cn('space-y-2', className)}>{children}</div>
}

/**
 * Campaign registration form styled like Creative Tim AccountBasicInfo01,
 * wired to placement campaign allowlisted fields.
 * Uses native select/date inputs for reliability (no blank-page crashes).
 */
export function CampaignRegistrationBasicInfoForm({
  title,
  description,
  expiresAt,
  form,
  set,
  setPlatformHandle,
  setResumeFile,
  fileInputKey = 0,
  allowedFields,
  saving,
  error,
  success,
  onDismissSuccess,
  submitLabel = 'Register',
  onSubmit,
}: Props) {
  const isAllowed = (field: string) => {
    if (field === 'roll_number' || field === 'full_name' || field === 'email') return true
    if (!allowedFields?.length) return true
    return allowedFields.includes(field)
  }

  const visiblePlatforms = ALL_PLATFORMS.filter(
    (platform) => isAllowed('platform_handles') || isAllowed(`platform_handles.${platform}`),
  )
  const resumeAllowed = isAllowed('resume')
  const yearRequired = isAllowed('batch') || isAllowed('academic_batch')

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
      <div className="mb-6">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-muted">{BRAND_NAME}</p>
        <h1 className="mt-2 font-heading text-[28px] font-bold tracking-tight">{title}</h1>
        <p className="mt-2 text-[14px] text-secondary">
          {description ||
            'Fill in your details below to register. Roll number is unique — submit again with the same roll to correct any wrong details.'}
        </p>
        {expiresAt ? (
          <p className="mt-2 text-[12px] text-muted">
            Link expires {new Date(expiresAt).toLocaleString()}.
          </p>
        ) : null}
      </div>

      <Card className="border border-soft bg-card p-6 sm:p-8">
        <div className="border-b border-soft pb-6">
          <h2 className="text-2xl font-semibold tracking-tight">Personal Information</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter the details requested for this placement registration campaign. Required fields are
            marked with *.
          </p>
        </div>

        <form className="mt-8 space-y-8" onSubmit={onSubmit}>
          <div className="space-y-6">
            <div>
              <h3 className="mb-4 text-sm font-medium">Basic Details</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FieldShell show={isAllowed('full_name')}>
                  <Label htmlFor="fullName" className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    Full name *
                  </Label>
                  <Input
                    id="fullName"
                    required
                    placeholder="Enter full name"
                    value={form.fullName}
                    onChange={(e) => set('fullName', e.target.value)}
                  />
                </FieldShell>
                <FieldShell show={isAllowed('roll_number')}>
                  <Label htmlFor="rollNumber" className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-muted-foreground" />
                    Roll number *
                  </Label>
                  <Input
                    id="rollNumber"
                    required
                    className="font-mono"
                    placeholder="e.g. 24ME1A0538"
                    value={form.rollNumber}
                    onChange={(e) => set('rollNumber', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Unique — resubmit with the same roll to update details.
                  </p>
                </FieldShell>
              </div>
            </div>

            <div>
              <h3 className="mb-4 text-sm font-medium">Academic Information</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <FieldShell show={isAllowed('branch')}>
                  <Label htmlFor="branch" className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    Branch
                  </Label>
                  <Input
                    id="branch"
                    placeholder="e.g. CSE"
                    value={form.branch}
                    onChange={(e) => set('branch', e.target.value)}
                  />
                </FieldShell>

                <FieldShell show={yearRequired}>
                  <Label htmlFor="batch" className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-muted-foreground" />
                    Year of pass out *
                  </Label>
                  <select
                    id="batch"
                    className={selectClassName}
                    value={form.batch}
                    required={yearRequired}
                    onChange={(e) => set('batch', e.target.value)}
                  >
                    <option value="">Select year</option>
                    <option value="2027">2027</option>
                    <option value="2028">2028</option>
                    <option value="2029">2029</option>
                    <option value="2030">2030</option>
                  </select>
                </FieldShell>

                <FieldShell show={isAllowed('date_of_birth')}>
                  <Label htmlFor="dob" className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    Date of birth
                  </Label>
                  <Input
                    id="dob"
                    type="date"
                    value={form.dateOfBirth ?? ''}
                    onChange={(e) => set('dateOfBirth', e.target.value || null)}
                  />
                </FieldShell>

                <FieldShell show={isAllowed('cgpa')}>
                  <Label htmlFor="cgpa" className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-muted-foreground" />
                    CGPA
                  </Label>
                  <Input
                    id="cgpa"
                    type="number"
                    step="0.01"
                    min={0}
                    max={10}
                    placeholder="e.g. 8.45"
                    value={form.cgpa ?? ''}
                    onChange={(e) => set('cgpa', e.target.value ? Number(e.target.value) : null)}
                  />
                </FieldShell>

                <FieldShell show={isAllowed('active_backlogs')}>
                  <Label htmlFor="backlogs" className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    Active backlogs
                  </Label>
                  <Input
                    id="backlogs"
                    type="number"
                    min={0}
                    value={form.activeBacklogs}
                    onChange={(e) => set('activeBacklogs', Number(e.target.value))}
                  />
                </FieldShell>
              </div>
            </div>

            <div>
              <h3 className="mb-4 text-sm font-medium">Contact Information</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FieldShell show={isAllowed('email')}>
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    Email address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@college.edu"
                    value={form.email}
                    onChange={(e) => set('email', e.target.value)}
                  />
                </FieldShell>
                <FieldShell show={isAllowed('phone')}>
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    Phone number
                  </Label>
                  <Input
                    id="phone"
                    placeholder="+91 …"
                    value={form.phone}
                    onChange={(e) => set('phone', e.target.value)}
                  />
                </FieldShell>
                <FieldShell show={isAllowed('linkedin_url')}>
                  <Label htmlFor="linkedin" className="flex items-center gap-2">
                    <Link2 className="h-4 w-4 text-muted-foreground" />
                    LinkedIn URL
                  </Label>
                  <Input
                    id="linkedin"
                    placeholder="https://linkedin.com/in/…"
                    value={form.linkedinUrl}
                    onChange={(e) => set('linkedinUrl', e.target.value)}
                  />
                </FieldShell>
                <FieldShell show={isAllowed('github_url')}>
                  <Label htmlFor="github" className="flex items-center gap-2">
                    <Link2 className="h-4 w-4 text-muted-foreground" />
                    GitHub URL
                  </Label>
                  <Input
                    id="github"
                    placeholder="https://github.com/…"
                    value={form.githubUrl}
                    onChange={(e) => set('githubUrl', e.target.value)}
                  />
                </FieldShell>
                <FieldShell show={isAllowed('portfolio_url')} className="sm:col-span-2">
                  <Label htmlFor="portfolio" className="flex items-center gap-2">
                    <Link2 className="h-4 w-4 text-muted-foreground" />
                    Portfolio URL
                  </Label>
                  <Input
                    id="portfolio"
                    placeholder="https://…"
                    value={form.portfolioUrl}
                    onChange={(e) => set('portfolioUrl', e.target.value)}
                  />
                </FieldShell>
              </div>
            </div>

            <div>
              <h3 className="mb-4 text-sm font-medium">Skills & Career</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FieldShell show={isAllowed('skills_summary')} className="sm:col-span-2">
                  <Label htmlFor="skills">Skills summary</Label>
                  <Input
                    id="skills"
                    placeholder="Python, React, SQL…"
                    value={form.skillsSummary}
                    onChange={(e) => set('skillsSummary', e.target.value)}
                  />
                </FieldShell>
                <FieldShell show={isAllowed('career_interest')} className="sm:col-span-2">
                  <Label htmlFor="career">Career interest</Label>
                  <Input
                    id="career"
                    placeholder="Software engineer, data analyst…"
                    value={form.careerInterest}
                    onChange={(e) => set('careerInterest', e.target.value)}
                  />
                </FieldShell>
                <FieldShell show={isAllowed('projects_summary')} className="sm:col-span-2">
                  <Label htmlFor="projects">Projects summary</Label>
                  <textarea
                    id="projects"
                    className="min-h-28 w-full rounded-lg border border-soft bg-[#0B0E11] px-3 py-2 text-sm outline-none focus-visible:border-[#3B82F6] focus-visible:ring-2 focus-visible:ring-[#3B82F6]/35"
                    placeholder="Briefly describe your projects"
                    value={form.projectsSummary}
                    onChange={(e) => set('projectsSummary', e.target.value)}
                  />
                </FieldShell>
                <FieldShell show={isAllowed('certifications_summary')} className="sm:col-span-2">
                  <CertificationsListField
                    value={form.certificationsSummary}
                    onChange={(value) => set('certificationsSummary', value)}
                  />
                </FieldShell>
              </div>
            </div>

            {visiblePlatforms.length ? (
              <div>
                <h3 className="mb-4 text-sm font-medium">Coding platform handles</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {visiblePlatforms.map((platform) => (
                    <div key={platform} className="space-y-2">
                      <Label htmlFor={`platform-${platform}`} className="capitalize">
                        {platform}
                      </Label>
                      <Input
                        id={`platform-${platform}`}
                        className="font-mono text-xs"
                        placeholder="username"
                        value={form.platformHandles?.[platform] ?? ''}
                        onChange={(e) => setPlatformHandle(platform, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {resumeAllowed ? (
              <div>
                <h3 className="mb-4 text-sm font-medium">Resume</h3>
                <div className="rounded-xl border border-soft bg-background/40 p-4">
                  <Label htmlFor="resume" className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    Upload resume
                  </Label>
                  <Input
                    key={fileInputKey}
                    id="resume"
                    className="mt-2"
                    type="file"
                    accept=".pdf,.doc,.docx,application/pdf"
                    onChange={(e) => setResumeFile(e.target.files?.[0] ?? null)}
                  />
                  <p className="mt-2 text-xs text-muted-foreground">
                    PDF preferred. Upload with your registration form.
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          {error ? <p className="text-sm font-semibold text-[#C45C1A]">{error}</p> : null}

          <div className="flex justify-end gap-3 border-t border-soft pt-6">
            <Button type="submit" disabled={saving} size="lg">
              {saving ? 'Submitting…' : submitLabel}
            </Button>
          </div>
        </form>
      </Card>

      <RegistrationSuccessPopup
        open={Boolean(success)}
        title="Upload successful"
        message={success}
        onClose={() => onDismissSuccess?.()}
      />
    </div>
  )
}
