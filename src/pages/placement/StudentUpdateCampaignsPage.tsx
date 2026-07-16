import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PlacementLink } from '@/components/placement/PlacementLink'
import { PlacementShell, usePlacementPaths } from '@/components/placement/PlacementShell'
import { PlacementPageHeader } from '@/components/placement/PlacementPageHeader'
import { PlacementEmptyState, PlacementStatCard } from '@/components/placement/PlacementStates'
import {
  PlacementAlerts,
  PlacementPageBody,
  PlacementPageStack,
  PlacementTableCard,
} from '@/components/placement/PlacementUi'
import {
  deleteCampaign,
  getCampaignSummary,
  listCampaigns,
  type StudentUpdateCampaignRow,
} from '@/api/placement/studentUpdateCampaigns'
import { canManageCampaigns } from '@/lib/placementPermissions'
import { useAuth } from '@/hooks/useAuth'

export function StudentUpdateCampaignsPage() {
  const { base } = usePlacementPaths()
  const { placementRole } = useAuth()
  const canManage = canManageCampaigns(placementRole)
  const [campaigns, setCampaigns] = useState<StudentUpdateCampaignRow[]>([])
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof getCampaignSummary>> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [list, stats] = await Promise.all([listCampaigns(), getCampaignSummary()])
      setCampaigns(list)
      setSummary(stats)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load campaigns')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const handleDelete = async (campaign: StudentUpdateCampaignRow) => {
    const ok = window.confirm(
      `Delete "${campaign.title}"? The registration link will stop working. Registered students will remain in the application.`,
    )
    if (!ok) return

    setDeletingId(campaign.id)
    setError(null)
    try {
      await deleteCampaign(campaign.id)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete campaign')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <PlacementShell title="Student Update Campaigns">
      <PlacementPageHeader
        title="Student Registration Campaigns"
        description="Create one shared registration link. Students fill the form themselves and are added to the placement application — no pre-existing student data required."
        actions={
          canManage && base ? (
            <Button asChild size="sm">
              <PlacementLink href={`${base}/student-update-campaigns/new`}>Create campaign</PlacementLink>
            </Button>
          ) : null
        }
      />

      <PlacementPageStack>
        <PlacementAlerts error={error} />

        {summary ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
            <PlacementStatCard label="Campaigns" value={summary.campaigns} />
            <PlacementStatCard label="Registrations" value={summary.students} />
            <PlacementStatCard label="Opened" value={summary.opened} />
            <PlacementStatCard label="Completed" value={summary.completed} />
            <PlacementStatCard label="Pending" value={summary.pending} />
            <PlacementStatCard label="Expired" value={summary.expired} />
          </div>
        ) : null}

        <PlacementPageBody
          loading={loading}
          loadingLabel="Loading campaigns…"
          empty={!campaigns.length ? (
            <PlacementEmptyState
              title="No registration campaigns yet"
              description="Create a campaign to get one shared link for student self-registration."
              action={
                canManage && base ? (
                  <Button asChild size="sm">
                    <PlacementLink href={`${base}/student-update-campaigns/new`}>Create campaign</PlacementLink>
                  </Button>
                ) : undefined
              }
            />
          ) : undefined}
        >
          {campaigns.length ? (
            <PlacementTableCard title="Campaigns">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((campaign) => (
                    <TableRow key={campaign.id}>
                      <TableCell className="font-semibold">{campaign.title}</TableCell>
                      <TableCell className="capitalize">{campaign.status}</TableCell>
                      <TableCell className="text-secondary">
                        {campaign.expires_at ? new Date(campaign.expires_at).toLocaleDateString() : '—'}
                      </TableCell>
                      <TableCell className="text-secondary">
                        {new Date(campaign.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {base ? (
                            <Button asChild variant="outline" size="sm">
                              <PlacementLink
                                href={`${base}/student-update-campaigns/$id`}
                                params={{ id: campaign.id }}
                              >
                                Open
                              </PlacementLink>
                            </Button>
                          ) : null}
                          {canManage ? (
                            <Button
                              variant="secondary"
                              size="sm"
                              disabled={deletingId === campaign.id}
                              onClick={() => void handleDelete(campaign)}
                            >
                              {deletingId === campaign.id ? 'Deleting…' : 'Delete'}
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </PlacementTableCard>
          ) : null}
        </PlacementPageBody>
      </PlacementPageStack>
    </PlacementShell>
  )
}
