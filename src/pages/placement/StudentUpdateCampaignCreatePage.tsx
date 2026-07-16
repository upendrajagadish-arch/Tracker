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

export function StudentUpdateCampaignCreatePage() {
  const navigate = useNavigate()
  const { base } = usePlacementPaths()
  const { placementRole } = useAuth()
  const canManage = canManageCampaigns(placementRole)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
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
