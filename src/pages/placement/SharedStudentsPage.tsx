import { useCallback, useEffect, useState } from 'react'
import { PlacementLink } from '@/components/placement/PlacementLink'
import { Button } from '@/components/ui/button'
import { PlacementShell, usePlacementPaths } from '@/components/placement/PlacementShell'
import { PlacementPageHeader } from '@/components/placement/PlacementPageHeader'
import { ModuleStatusBadge } from '@/components/placement/PlacementBadges'
import {
  PlacementAlerts,
  PlacementPageBody,
  PlacementPageStack,
  PlacementSectionCard,
} from '@/components/placement/PlacementUi'
import { PlacementEmptyState } from '@/components/placement/PlacementStates'
import { listBooks } from '@/api/placement/resumeBooks'

export function SharedStudentsPage() {
  const { base } = usePlacementPaths()
  const [books, setBooks] = useState<Awaited<ReturnType<typeof listBooks>>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setBooks(await listBooks())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load shared collections')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const sharedBooks = books.filter((book) => book.is_shareable && book.share_token)

  return (
    <PlacementShell title="Shared Students">
      <PlacementPageHeader
        title="Shared Students"
        description="Resume books and student dossiers shared with recruiters via secure links."
        actions={
          base ? (
            <Button asChild variant="outline" size="sm">
              <PlacementLink href={`${base}/resume-books`}>Manage resume books</PlacementLink>
            </Button>
          ) : null
        }
      />

      <PlacementPageStack>
        <PlacementAlerts error={error} />

        <PlacementPageBody
          loading={loading}
          loadingLabel="Loading shared collections…"
          empty={!sharedBooks.length ? (
            <PlacementEmptyState
              title="No shared student collections"
              description="Create a resume book and generate a share link to publish student dossiers externally."
              action={
                base ? (
                  <Button asChild size="sm">
                    <PlacementLink href={`${base}/resume-books/create`}>Create resume book</PlacementLink>
                  </Button>
                ) : undefined
              }
            />
          ) : undefined}
        >
          {sharedBooks.length ? (
            <div className="grid gap-4">
              {sharedBooks.map((book) => (
                <PlacementSectionCard
                  key={book.id}
                  title={book.title}
                  description={book.description || 'Shared placement dossier collection'}
                  actions={<ModuleStatusBadge status={book.status} />}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
                    <span>{book.total_students} students · {book.book_type.replace(/_/g, ' ')}</span>
                    <div className="flex flex-wrap gap-2">
                      {base ? (
                        <Button asChild variant="outline" size="sm">
                          <PlacementLink href={`${base}/resume-books/$id`} params={{ id: book.id }}>Open book</PlacementLink>
                        </Button>
                      ) : null}
                      {book.share_token ? (
                        <Button asChild variant="outline" size="sm">
                          <a href={`/public/resume-books/${book.share_token}`} target="_blank" rel="noreferrer">Public link</a>
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </PlacementSectionCard>
              ))}
            </div>
          ) : null}
        </PlacementPageBody>
      </PlacementPageStack>
    </PlacementShell>
  )
}
