import { useCallback, useEffect, useState } from 'react'
import { PlacementLink } from '@/components/placement/PlacementLink'
import { Button } from '@/components/ui/button'
import { PlacementShell, usePlacementPaths } from '@/components/placement/PlacementShell'
import { PlacementPageHeader } from '@/components/placement/PlacementPageHeader'
import { ModuleStatusBadge } from '@/components/placement/PlacementBadges'
import { PlacementEmptyState } from '@/components/placement/PlacementStates'
import {
  PlacementAlerts,
  PlacementPageBody,
  PlacementPageStack,
  PlacementSectionCard,
  formatEnumLabel,
} from '@/components/placement/PlacementUi'
import { archiveBook, listBooks } from '@/api/placement/resumeBooks'
import { canExportResumeBooks } from '@/lib/placementNavigation'

export function ResumeBooksPage() {
  const { base, role } = usePlacementPaths()
  const canCreate = canExportResumeBooks(role)
  const [books, setBooks] = useState<Awaited<ReturnType<typeof listBooks>>>([])
  const [loading, setLoading] = useState(true)
  const [archiving, setArchiving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setBooks(await listBooks())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load resume books')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const handleArchive = async (bookId: string) => {
    setArchiving(bookId)
    setError(null)
    try {
      await archiveBook(bookId)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Archive failed')
    } finally {
      setArchiving(null)
    }
  }

  return (
    <PlacementShell title="Resume Books">
      <PlacementPageHeader
        title="Resume Books"
        description="Generated snapshot collections for placement sharing."
        actions={
          canCreate && base ? (
            <Button asChild size="sm">
              <PlacementLink href={`${base}/resume-books/create`}>Create book</PlacementLink>
            </Button>
          ) : null
        }
      />

      <PlacementPageStack>
        <PlacementAlerts error={error} />

        <PlacementPageBody
          loading={loading}
          loadingLabel="Loading resume books…"
          empty={!books.length ? (
            <PlacementEmptyState
              title="No resume books"
              description="Generate a book from student filters to share placement dossiers."
              action={
                canCreate && base ? (
                  <Button asChild size="sm">
                    <PlacementLink href={`${base}/resume-books/create`}>Create book</PlacementLink>
                  </Button>
                ) : undefined
              }
            />
          ) : undefined}
        >
          {books.length ? (
            <div className="grid gap-4">
              {books.map((book) => (
                <PlacementSectionCard
                  key={book.id}
                  title={base ? (
                    <PlacementLink href={`${base}/resume-books/$id`} params={{ id: book.id }} className="text-primary hover:underline">
                      {book.title}
                    </PlacementLink>
                  ) : book.title}
                  description={book.description || 'No description provided'}
                  actions={<ModuleStatusBadge status={book.status} />}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
                    <span>{book.total_students} students · {formatEnumLabel(book.book_type)}</span>
                    <div className="flex flex-wrap gap-2">
                      {base ? (
                        <Button asChild variant="outline" size="sm">
                          <PlacementLink href={`${base}/resume-books/$id`} params={{ id: book.id }}>Open</PlacementLink>
                        </Button>
                      ) : null}
                      {canCreate ? (
                        <Button variant="destructive" size="sm" disabled={archiving === book.id} onClick={() => void handleArchive(book.id)}>
                          {archiving === book.id ? 'Archiving…' : 'Archive'}
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
