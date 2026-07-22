import { useState, type FormEvent } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PlacementShell, usePlacementPaths } from '@/components/placement/PlacementShell'
import { PlacementPageHeader } from '@/components/placement/PlacementPageHeader'
import {
  PlacementAlerts,
  PlacementField,
  PlacementFilterCard,
  PlacementPageStack,
} from '@/components/placement/PlacementUi'
import { createCampaignWithTokens } from '@/api/placement/studentUpdateCampaigns'
import { canManageCampaigns } from '@/lib/placementPermissions'
import { useAuth } from '@/hooks/useAuth'
import { PlacementLink, asPlacementPath } from '@/components/placement/PlacementLink'
import { ALL_PLATFORMS } from '@/api/unifiedClient'

const FIELD_GROUPS = [
  {
    title: 'Contact details',
    fields: [
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'date_of_birth', label: 'Date of birth' },
    ],
  },
  {
    title: 'Academic details',
    fields: [
      { key: 'branch', label: 'Branch' },
      { key: 'batch', label: 'Year of pass out (2027–2030)' },
      { key: 'section', label: 'Training program (Ignite / Pinnacle / Connect)' },
      { key: 'cgpa', label: 'CGPA' },
      { key: 'active_backlogs', label: 'Active backlogs' },
    ],
  },
  {
    title: 'Skills and career',
    fields: [
      { key: 'skills_summary', label: 'Skills summary' },
      { key: 'career_interest', label: 'Career interest' },
      { key: 'projects_summary', label: 'Projects summary' },
      { key: 'certifications_summary', label: 'Certification links' },
    ],
  },
  {
    title: 'Links and documents',
    fields: [
      { key: 'linkedin_url', label: 'LinkedIn URL' },
      { key: 'github_url', label: 'GitHub profile URL' },
      { key: 'portfolio_url', label: 'Portfolio URL' },
      { key: 'resume', label: 'Resume upload' },
    ],
  },
] as const

const OPTIONAL_FIELDS = [
  ...FIELD_GROUPS.flatMap((group) => group.fields.map((field) => field.key)),
  ...ALL_PLATFORMS.map((platform) => `platform_handles.${platform}`),
]

const REQUIRED_FIELDS = ['roll_number', 'full_name'] as const

export function StudentUpdateCampaignCreatePage() {
  const navigate = useNavigate()
  const { base } = usePlacementPaths()
  const { placementRole } = useAuth()
  const canManage = canManageCampaigns(placementRole)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [selectedFields, setSelectedFields] = useState<string[]>(() => [
    ...REQUIRED_FIELDS,
    ...OPTIONAL_FIELDS,
  ])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  if (!canManage) {
    return (
      <PlacementShell title="Create campaign">
        <PlacementPageHeader title="Create campaign" description="Only admin and TPO can manage campaigns." />
      </PlacementShell>
    )
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const { campaign } = await createCampaignWithTokens({
        title,
        description,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        allowlistedFields: selectedFields,
      })
      setSuccess('Registration campaign created. Share the link with students — they can register themselves.')
      if (base) {
        navigate({ to: asPlacementPath(`${base}/student-update-campaigns/${campaign.id}`) as never })
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create campaign')
    } finally {
      setSaving(false)
    }
  }

  return (
    <PlacementShell title="Create campaign">
      <PlacementPageHeader
        title="Create registration campaign"
        description="Generate one shared link. Students open it, fill their details, and are added to the placement application automatically."
        actions={
          base ? (
            <Button asChild variant="outline" size="sm">
              <PlacementLink href={`${base}/student-update-campaigns`}>Back</PlacementLink>
            </Button>
          ) : null
        }
      />

      <PlacementPageStack>
        <PlacementAlerts error={error} success={success} />

        <form onSubmit={handleSubmit} className="app-stack">
          <PlacementFilterCard title="Campaign details">
            <div className="grid gap-4 md:grid-cols-2">
              <PlacementField label="Title">
                <Input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="2027 Batch student registration" />
              </PlacementField>
              <PlacementField label="Expires on">
                <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
              </PlacementField>
              <PlacementField label="Description" className="md:col-span-2">
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Please register and complete your placement profile"
                />
              </PlacementField>
            </div>
            <p className="mt-3 text-[13px] text-secondary">
              No student list is required. Share one link with everyone — new students register themselves and duplicates are blocked by roll number and email.
            </p>
          </PlacementFilterCard>

          <PlacementFilterCard title="Registration form sections">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Choose what students must fill in</p>
                <p className="mt-1 text-xs text-secondary">
                  Roll number and full name are always required. Untick any field or coding platform you do not need.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedFields([...REQUIRED_FIELDS, ...OPTIONAL_FIELDS])}
                >
                  Select all
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedFields([...REQUIRED_FIELDS])}
                >
                  Clear optional
                </Button>
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <div className="rounded-card border border-soft bg-card/60 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-muted">Always included</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {['Roll number', 'Full name'].map((label) => (
                    <div key={label} className="flex items-center gap-2 rounded-button border border-[#0ECB81]/25 bg-[#0ECB81]/5 px-3 py-2 text-sm font-semibold">
                      <span className="flex size-4 items-center justify-center rounded border border-[#0ECB81] bg-[#0ECB81] text-[10px] text-black">✓</span>
                      {label}
                    </div>
                  ))}
                </div>
              </div>

              {FIELD_GROUPS.map((group) => (
                <fieldset key={group.title} className="rounded-card border border-soft bg-card/60 p-4">
                  <legend className="px-1 text-xs font-bold uppercase tracking-wide text-muted">{group.title}</legend>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {group.fields.map((field) => (
                      <label key={field.key} className="flex cursor-pointer items-center gap-2 rounded-button px-2 py-2 text-sm transition-colors hover:bg-elevated">
                        <input
                          type="checkbox"
                          checked={selectedFields.includes(field.key)}
                          onChange={(event) =>
                            setSelectedFields((current) =>
                              event.target.checked
                                ? [...current, field.key]
                                : current.filter((key) => key !== field.key),
                            )
                          }
                          className="size-4 accent-[#D27918]"
                        />
                        {field.label}
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}

              <fieldset className="rounded-card border border-soft bg-card/60 p-4 lg:col-span-2">
                <legend className="px-1 text-xs font-bold uppercase tracking-wide text-muted">Coding platforms</legend>
                <p className="mt-1 text-xs text-secondary">Select each platform handle that should appear in the registration form.</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {ALL_PLATFORMS.map((platform) => {
                    const key = `platform_handles.${platform}`
                    return (
                      <label key={platform} className="flex cursor-pointer items-center gap-2 rounded-button border border-soft px-3 py-2 text-sm capitalize transition-colors hover:bg-elevated">
                        <input
                          type="checkbox"
                          checked={selectedFields.includes(key)}
                          onChange={(event) =>
                            setSelectedFields((current) =>
                              event.target.checked
                                ? [...current, key]
                                : current.filter((field) => field !== key),
                            )
                          }
                          className="size-4 accent-[#D27918]"
                        />
                        {platform}
                      </label>
                    )
                  })}
                </div>
              </fieldset>
            </div>

            <p className="mt-4 text-xs font-semibold text-[#D27918]">
              {selectedFields.length} fields selected for this registration link
            </p>
          </PlacementFilterCard>

          <div>
            <Button type="submit" disabled={saving || !title.trim()}>
              {saving ? 'Creating…' : 'Create registration link'}
            </Button>
          </div>
        </form>
      </PlacementPageStack>
    </PlacementShell>
  )
}
