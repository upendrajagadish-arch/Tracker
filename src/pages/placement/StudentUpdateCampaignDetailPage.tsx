import { useCallback, useEffect, useState } from 'react'
import { useParams } from '@tanstack/react-router'
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
  campaignUpdateUrl,
  disableCampaignToken,
  extendCampaignToken,
  getCampaign,
  listCampaignRecipients,
  regenerateCampaignToken,
  type CampaignRecipientRow,
  type StudentUpdateCampaignRow,
} from '@/api/placement/studentUpdateCampaigns'
import { displayAcademicBatch } from '@/lib/academicBatch'
import { canManageCampaigns } from '@/lib/placementPermissions'
import { useAuth } from '@/hooks/useAuth'

export function StudentUpdateCampaignDetailPage() {
  const { id } = useParams({ strict: false }) as { id: string }
  const { base } = usePlacementPaths()
  const { placementRole } = useAuth()
  const canManage = canManageCampaigns(placementRole)

  const [campaign, setCampaign] = useState<StudentUpdateCampaignRow | null>(null)
  const [recipients, setRecipients] = useState<CampaignRecipientRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [camp, rows] = await Promise.all([getCampaign(id), listCampaignRecipients(id)])
      setCampaign(camp)
      setRecipients(rows)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load campaign')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  const opened = recipients.filter((r) => r.opened_at).length
  const completed = recipients.filter((r) => r.submitted_at).length
  const pending = recipients.filter((r) => !r.submitted_at && r.is_active && !r.revoked_at).length
  const expired = recipients.filter((r) => r.revoked_at || !r.is_active || new Date(r.expires_at).getTime() <= Date.now()).length

  const copyLink = async (token: string) => {
    await navigator.clipboard.writeText(campaignUpdateUrl(token))
    setSuccess('Link copied')
    setTimeout(() => setSuccess(null), 2000)
  }

  const runAction = async (tokenId: string, action: 'disable' | 'extend' | 'regenerate') => {
    setBusyId(tokenId)
    setError(null)
    try {
      if (action === 'disable') await disableCampaignToken(tokenId)
      if (action === 'extend') await extendCampaignToken(tokenId, 14)
      if (action === 'regenerate') await regenerateCampaignToken(tokenId)
      setSuccess(action === 'disable' ? 'Link disabled' : action === 'extend' ? 'Expiry extended' : 'Link regenerated')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <PlacementShell title="Campaign detail">
      <PlacementPageHeader
        title={campaign?.title || 'Campaign'}
        description={campaign?.description || 'Secure student profile update campaign'}
        actions={
          base ? (
            <Button asChild variant="outline" size="sm">
              <PlacementLink href={`${base}/student-update-campaigns`}>All campaigns</PlacementLink>
            </Button>
          ) : null
        }
      />

      <PlacementPageStack>
        <PlacementAlerts error={error} success={success} />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <PlacementStatCard label="Recipients" value={recipients.length} />
          <PlacementStatCard label="Opened" value={opened} />
          <PlacementStatCard label="Completed" value={completed} />
          <PlacementStatCard label="Pending" value={pending} />
          <PlacementStatCard label="Expired / disabled" value={expired} />
        </div>

        <PlacementPageBody
          loading={loading}
          loadingLabel="Loading recipients…"
          empty={!recipients.length ? (
            <PlacementEmptyState title="No recipients" description="This campaign has no generated links." />
          ) : undefined}
        >
          {recipients.length ? (
            <PlacementTableCard title="Recipients">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Roll</TableHead>
                    <TableHead>Academic Batch</TableHead>
                    <TableHead>Opened</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Last activity</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recipients.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-semibold">{row.student?.full_name ?? '—'}</TableCell>
                      <TableCell className="font-mono text-xs">{row.student?.roll_number ?? '—'}</TableCell>
                      <TableCell>
                        {displayAcademicBatch({
                          academic_batch: row.student?.academic_batch,
                          batch: row.student?.batch,
                        })}
                      </TableCell>
                      <TableCell className="text-secondary">
                        {row.opened_at ? new Date(row.opened_at).toLocaleString() : '—'}
                      </TableCell>
                      <TableCell className="text-secondary">
                        {row.submitted_at ? new Date(row.submitted_at).toLocaleString() : '—'}
                      </TableCell>
                      <TableCell className="text-secondary">
                        {row.last_activity_at ? new Date(row.last_activity_at).toLocaleString() : '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          <Button size="sm" variant="outline" onClick={() => void copyLink(row.token)}>
                            Copy link
                          </Button>
                          {canManage ? (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={busyId === row.id}
                                onClick={() => void runAction(row.id, 'extend')}
                              >
                                Extend
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={busyId === row.id}
                                onClick={() => void runAction(row.id, 'regenerate')}
                              >
                                Regenerate
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                disabled={busyId === row.id}
                                onClick={() => void runAction(row.id, 'disable')}
                              >
                                Disable
                              </Button>
                              <Button size="sm" variant="ghost" disabled title="Email resend coming soon">
                                Resend
                              </Button>
                            </>
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
