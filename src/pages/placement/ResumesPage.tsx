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
import { PlacementShell } from '@/components/placement/PlacementShell'
import { PlacementPageHeader } from '@/components/placement/PlacementPageHeader'
import { ReviewStatusBadge } from '@/components/placement/PlacementBadges'
import {
  PlacementEmptyState,
  PlacementStatCard,
} from '@/components/placement/PlacementStates'
import {
  PlacementAlerts,
  PlacementPageBody,
  PlacementPageStack,
  PlacementTableCard,
} from '@/components/placement/PlacementUi'
import { listResumes, updateReviewStatus } from '@/api/placement/resumes'
import { useAuth } from '@/hooks/useAuth'

export function ResumesPage() {
  const { placementRole } = useAuth()
  const canReview = placementRole === 'admin' || placementRole === 'tpo'
  const [loading, setLoading] = useState(true)
  const [reviewing, setReviewing] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [resumes, setResumes] = useState<Awaited<ReturnType<typeof listResumes>>['data']>([])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await listResumes({ limit: 50 })
      setResumes(result.data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load resumes')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const handleReview = async (resumeId: string, reviewStatus: 'approved' | 'rejected' | 'needs_revision') => {
    setReviewing(resumeId)
    setError(null)
    try {
      await updateReviewStatus(resumeId, { reviewStatus })
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Review update failed')
    } finally {
      setReviewing(null)
    }
  }

  const pending = resumes.filter((r) => r.review_status === 'pending').length
  const approved = resumes.filter((r) => r.review_status === 'approved').length

  return (
    <PlacementShell title="Resumes">
      <PlacementPageHeader
        title="Resume Management"
        description="Review uploaded resumes, track review status, and monitor ATS readiness."
      />

      <PlacementPageStack>
        <PlacementAlerts error={error} />

        <div className="grid gap-4 sm:grid-cols-3">
          <PlacementStatCard label="Active resumes" value={resumes.length} />
          <PlacementStatCard label="Pending review" value={pending} />
          <PlacementStatCard label="Approved" value={approved} />
        </div>

        <PlacementPageBody
          loading={loading}
          loadingLabel="Loading resumes…"
          empty={!resumes.length ? (
            <PlacementEmptyState
              title="No resumes uploaded"
              description="Student resumes will appear here after TPO uploads them through resume management."
            />
          ) : undefined}
        >
          {resumes.length ? (
            <PlacementTableCard title="Resume queue" count={resumes.length}>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/40">
                    <TableHead>File name</TableHead>
                    <TableHead>Review status</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>ATS friendly</TableHead>
                    <TableHead>Uploaded</TableHead>
                    {canReview ? <TableHead>Actions</TableHead> : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resumes.map((resume) => (
                    <TableRow key={resume.id} className="hover:bg-muted/40">
                      <TableCell className="max-w-xs truncate font-medium">{resume.file_name}</TableCell>
                      <TableCell><ReviewStatusBadge status={resume.review_status} /></TableCell>
                      <TableCell>{resume.resume_score || '—'}</TableCell>
                      <TableCell>{resume.ats_friendly ? 'Yes' : 'No'}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {new Date(resume.created_at).toLocaleDateString()}
                      </TableCell>
                      {canReview ? (
                        <TableCell>
                          <div className="flex flex-wrap gap-1.5">
                            <Button size="sm" variant="outline" disabled={reviewing === resume.id} onClick={() => void handleReview(resume.id, 'approved')}>
                              Approve
                            </Button>
                            <Button size="sm" variant="outline" disabled={reviewing === resume.id} onClick={() => void handleReview(resume.id, 'needs_revision')}>
                              Revise
                            </Button>
                            <Button size="sm" variant="destructive" disabled={reviewing === resume.id} onClick={() => void handleReview(resume.id, 'rejected')}>
                              Reject
                            </Button>
                          </div>
                        </TableCell>
                      ) : null}
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
