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
  PlacementSelect,
} from '@/components/placement/PlacementUi'
import { PLACEMENT_STATUSES } from '@/components/placement/PlacementBadges'
import { createCampaignWithTokens } from '@/api/placement/studentUpdateCampaigns'
import { canManageCampaigns } from '@/lib/placementPermissions'
import { useAuth } from '@/hooks/useAuth'
import { PlacementLink, asPlacementPath } from '@/components/placement/PlacementLink'

export function StudentUpdateCampaignCreatePage() {
  const navigate = useNavigate()
  const { base } = usePlacementPaths()
  const { placementRole } = useAuth()
  const canManage = canManageCampaigns(placementRole)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [branch, setBranch] = useState('')
  const [academicBatch, setAcademicBatch] = useState('')
  const [section, setSection] = useState('')
  const [placementStatus, setPlacementStatus] = useState('')
  const [resumeMissing, setResumeMissing] = useState(false)
  const [codingMissing, setCodingMissing] = useState(false)
  const [communicationPending, setCommunicationPending] = useState(false)
  const [aptitudePending, setAptitudePending] = useState(false)
  const [verbalPending, setVerbalPending] = useState(false)
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
      const { campaign, tokenCount } = await createCampaignWithTokens({
        title,
        description,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        filters: {
          branch: branch || undefined,
          academicBatch: academicBatch || undefined,
          batch: academicBatch || undefined,
          section: section || undefined,
          placementStatus: placementStatus || undefined,
          resumeMissing: resumeMissing || undefined,
          codingMissing: codingMissing || undefined,
          communicationPending: communicationPending || undefined,
          aptitudePending: aptitudePending || undefined,
          verbalPending: verbalPending || undefined,
        },
      })
      setSuccess(`Created campaign with ${tokenCount} secure links.`)
      if (base) {
        navigate({ to: asPlacementPath(`${base}/student-update-campaigns/${campaign.id}`) })
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
        title="Create update campaign"
        description="Filter students, generate one secure update link per recipient, and share without requiring login."
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
                <Input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="2027 Batch profile refresh" />
              </PlacementField>
              <PlacementField label="Expires on">
                <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
              </PlacementField>
              <PlacementField label="Description" className="md:col-span-2">
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Please complete missing contact and dossier fields"
                />
              </PlacementField>
            </div>
          </PlacementFilterCard>

          <PlacementFilterCard title="Recipient filters">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <PlacementField label="Branch / Department">
                <Input value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="CSE" />
              </PlacementField>
              <PlacementField label="Academic Batch">
                <Input value={academicBatch} onChange={(e) => setAcademicBatch(e.target.value)} placeholder="2023-2027" />
              </PlacementField>
              <PlacementField label="Section">
                <Input value={section} onChange={(e) => setSection(e.target.value)} placeholder="A" />
              </PlacementField>
              <PlacementField label="Placement status">
                <PlacementSelect value={placementStatus} onChange={setPlacementStatus}>
                  <option value="">Any</option>
                  {PLACEMENT_STATUSES.map((status) => (
                    <option key={status} value={status}>{status.replace(/_/g, ' ')}</option>
                  ))}
                </PlacementSelect>
              </PlacementField>
            </div>
            <div className="mt-4 flex flex-wrap gap-4 text-[13px]">
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={resumeMissing} onChange={(e) => setResumeMissing(e.target.checked)} />
                Resume missing
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={codingMissing} onChange={(e) => setCodingMissing(e.target.checked)} />
                Coding missing
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={communicationPending} onChange={(e) => setCommunicationPending(e.target.checked)} />
                Communication pending
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={aptitudePending} onChange={(e) => setAptitudePending(e.target.checked)} />
                Aptitude pending
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={verbalPending} onChange={(e) => setVerbalPending(e.target.checked)} />
                Verbal pending
              </label>
            </div>
          </PlacementFilterCard>

          <div>
            <Button type="submit" disabled={saving || !title.trim()}>
              {saving ? 'Generating links…' : 'Generate campaign links'}
            </Button>
          </div>
        </form>
      </PlacementPageStack>
    </PlacementShell>
  )
}
