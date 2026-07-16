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
  campaignRegistrationUrl,
  getCampaign,
  listCampaignRegistrants,
  type CampaignRegistrantRow,
  type StudentUpdateCampaignRow,
} from '@/api/placement/studentUpdateCampaigns'
import { displayAcademicBatch } from '@/lib/academicBatch'

export function StudentUpdateCampaignDetailPage() {
  const { id } = useParams({ strict: false }) as { id: string }
  const { base } = usePlacementPaths()

  const [campaign, setCampaign] = useState<StudentUpdateCampaignRow | null>(null)
  const [registrants, setRegistrants] = useState<CampaignRegistrantRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [camp, rows] = await Promise.all([getCampaign(id), listCampaignRegistrants(id)])
      setCampaign(camp)
      setRegistrants(rows)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load campaign')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  const copyRegistrationLink = async () => {
    if (!campaign?.id) return
    await navigator.clipboard.writeText(campaignRegistrationUrl(campaign.id))
    setSuccess('Registration link copied')
    setTimeout(() => setSuccess(null), 2000)
  }

  return (
    <PlacementShell title="Campaign detail">
      <PlacementPageHeader
        title={campaign?.title || 'Campaign'}
        description={campaign?.description || 'Share one registration link. Students add themselves to the placement application.'}
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

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void copyRegistrationLink()} disabled={!campaign?.id}>
            Copy registration link
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <PlacementStatCard label="Registered students" value={registrants.length} />
          <PlacementStatCard label="Status" value={campaign?.status ?? '—'} />
          <PlacementStatCard
            label="Expires"
            value={campaign?.expires_at ? new Date(campaign.expires_at).toLocaleDateString() : 'No expiry'}
          />
        </div>

        <PlacementPageBody
          loading={loading}
          loadingLabel="Loading registrations…"
          empty={!registrants.length ? (
            <PlacementEmptyState
              title="No registrations yet"
              description="Share the registration link with students. When they submit the form, they will appear here."
            />
          ) : undefined}
        >
          {registrants.length ? (
            <PlacementTableCard title="Registered students">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Roll</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Academic Batch</TableHead>
                    <TableHead>Registered</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {registrants.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-semibold">{row.full_name}</TableCell>
                      <TableCell className="font-mono text-xs">{row.roll_number}</TableCell>
                      <TableCell className="text-secondary">{row.email || '—'}</TableCell>
                      <TableCell>
                        {displayAcademicBatch({
                          academic_batch: row.academic_batch,
                          batch: row.batch,
                        })}
                      </TableCell>
                      <TableCell className="text-secondary">
                        {new Date(row.created_at).toLocaleString()}
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
