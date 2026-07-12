import { useCallback, useEffect, useState } from 'react'
import { useParams } from '@tanstack/react-router'
import { SeoHead } from '@/components/SeoHead'
import { Card, CardContent } from '@/components/ui/card'
import { InteractiveResumeBook } from '@/components/placement/InteractiveResumeBook'
import { PlacementLoadingBlock } from '@/components/placement/PlacementStates'
import { getPublicResumeBook, getPublicResumeBookStudents } from '@/api/placement/resumeBooks'
import type { PublicResumeBook } from '@/api/placement/resumeBooks'
import { mapPublicSnapshot } from '@/lib/resumeBookMappers'

export function PublicResumeBookPage() {
  const { token } = useParams({ strict: false }) as { token: string }
  const [book, setBook] = useState<PublicResumeBook | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex,nofollow'
    document.head.appendChild(meta)
    return () => { document.head.removeChild(meta) }
  }, [])

  useEffect(() => {
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await getPublicResumeBook(token)
        if (!res) {
          setError('Invalid or expired link')
          return
        }
        if (res.expired) {
          setError('This share link has expired')
          return
        }
        setBook(res)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load resume book')
      } finally {
        setLoading(false)
      }
    })()
  }, [token])

  const fetchStudents = useCallback(
    async (page: number, limit: number) => {
      const res = await getPublicResumeBookStudents(token, page, limit)
      if (!res || res.expired) return { students: [], pagination: { page, limit, total: 0, pages: 0 } }
      const pagination = res.pagination as { page?: number; limit?: number; total?: number; pages?: number }
      return {
        students: res.students.map(mapPublicSnapshot),
        pagination: {
          page: Number(pagination.page ?? page),
          limit: Number(pagination.limit ?? limit),
          total: Number(pagination.total ?? 0),
          pages: Number(pagination.pages ?? 0),
        },
      }
    },
    [token],
  )

  if (loading) {
    return (
      <div className="placement-theme flex min-h-screen items-center justify-center bg-background">
        <PlacementLoadingBlock />
      </div>
    )
  }

  if (error || !book) {
    return (
      <>
        <SeoHead title="Resume book unavailable" />
        <div className="placement-theme flex min-h-screen items-center justify-center bg-background p-6">
          <Card className="max-w-md term-window border-border bg-card/80">
            <CardContent className="py-8 text-center">
              <h1 className="font-pixel text-lg text-foreground">Resume book unavailable</h1>
              <p className="mt-2 font-mono text-sm text-muted-foreground">{error || 'Invalid or expired link'}</p>
            </CardContent>
          </Card>
        </div>
      </>
    )
  }

  return (
    <>
      <SeoHead title={`${book.title} — Shared Resume Book`} />
      <div className="placement-theme min-h-screen bg-background px-4 py-8">
        <div className="mx-auto max-w-5xl">
          <p className="mb-2 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Shared placement resume book
          </p>
          <InteractiveResumeBook
            title={book.title}
            totalStudents={book.totalStudents}
            fetchStudents={fetchStudents}
            shareSettings={book.shareSettings as { allowResumeDownload?: boolean; allowExternalLinks?: boolean }}
            isPublic
          />
          {book.expiresAt ? (
            <p className="mt-6 text-center text-xs text-muted-foreground">
              Link expires {new Date(book.expiresAt).toLocaleDateString()}
            </p>
          ) : null}
          <p className="mt-4 text-center font-mono text-[10px] text-[var(--term-amber)]">
            Confidential — share only with authorized placement stakeholders.
          </p>
        </div>
      </div>
    </>
  )
}
