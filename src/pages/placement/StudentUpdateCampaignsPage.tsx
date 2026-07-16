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

  return (
    <PlacementShell title="Student Update Campaigns">
      <PlacementPageHeader
        title="Student Update Campaigns"
        description="Generate secure, login-free update links so students can complete their own placement profiles."
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
            <PlacementStatCard label="Students" value={summary.students} />
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
              title="No update campaigns yet"
              description="Create a campaign from Student Tracker filters to issue secure profile-update links."
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
                    <TableHead />
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
