import { useCallback, useEffect, useState } from 'react'
import { useParams } from '@tanstack/react-router'
import { PlacementLink } from '@/components/placement/PlacementLink'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { InteractiveResumeBook } from '@/components/placement/InteractiveResumeBook'
import { PlacementShell, usePlacementPaths } from '@/components/placement/PlacementShell'
import { PlacementPageHeader } from '@/components/placement/PlacementPageHeader'
import { PlacementErrorAlert, PlacementLoadingBlock } from '@/components/placement/PlacementStates'
import { createShareLink, getBookStudents, listBooks } from '@/api/placement/resumeBooks'
import type { ResumeBookRow } from '@/api/placement/resumeBooks'
import { mapSnapshotRow } from '@/lib/resumeBookMappers'
import { canExportResumeBooks } from '@/lib/placementNavigation'

export function ResumeBookViewPage() {
  const { id } = useParams({ strict: false }) as { id: string }
  const { base, role } = usePlacementPaths()
  const canShare = canExportResumeBooks(role)
  const [book, setBook] = useState<ResumeBookRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [sharing, setSharing] = useState(false)

  useEffect(() => {
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const books = await listBooks()
        const found = books.find((b) => b.id === id) ?? null
        if (!found) setError('Resume book not found')
        setBook(found)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load book')
      } finally {
        setLoading(false)
      }
    })()
  }, [id])

  const fetchStudents = useCallback(
    async (page: number, limit: number) => {
      const res = await getBookStudents(id, page, limit)
      return {
        students: res.data.map(mapSnapshotRow),
        pagination: res.pagination,
      }
    },
    [id],
  )

  const handleShare = async () => {
    setSharing(true)
    setError(null)
    try {
      const updated = await createShareLink(id, {
        shareSettings: { allowResumeDownload: true, allowExternalLinks: true },
      })
      if (updated.share_token) {
        setShareUrl(`${window.location.origin}/public/resume-books/${updated.share_token}`)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Share link failed')
    } finally {
      setSharing(false)
    }
  }

  return (
    <PlacementShell title="Resume Book">
      <PlacementPageHeader
        title={book?.title ?? 'Resume Book'}
        description={book?.description}
        actions={
          <div className="flex flex-wrap gap-2">
            {base ? (
              <Button asChild variant="outline" size="sm">
                <PlacementLink href={`${base}/resume-books`}>← Books</PlacementLink>
              </Button>
            ) : null}
            {canShare ? (
              <Button size="sm" disabled={sharing} onClick={() => void handleShare()}>
                {sharing ? 'Creating link…' : 'Create share link'}
              </Button>
            ) : null}
          </div>
        }
      />

      {error ? <div className="mb-4"><PlacementErrorAlert message={error} /></div> : null}
      {shareUrl ? (
        <Card className="mb-4 border-primary/30 bg-primary/10">
          <CardContent className="py-3 text-sm">
            <p className="font-medium text-primary">Share link created</p>
            <Input readOnly value={shareUrl} className="mt-2 border-emerald-200 bg-card" />
          </CardContent>
        </Card>
      ) : null}

      {loading ? <PlacementLoadingBlock /> : null}
      {!loading && book ? (
        <InteractiveResumeBook
          title={book.title}
          totalStudents={book.total_students}
          fetchStudents={fetchStudents}
          shareSettings={(book.share_settings as { allowResumeDownload?: boolean; allowExternalLinks?: boolean }) ?? {}}
        />
      ) : null}
    </PlacementShell>
  )
}
