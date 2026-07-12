import { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { PlacementLink } from '@/components/placement/PlacementLink'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { PlacementShell, usePlacementPaths } from '@/components/placement/PlacementShell'
import { PlacementPageHeader } from '@/components/placement/PlacementPageHeader'
import { PlacementErrorAlert } from '@/components/placement/PlacementStates'
import { generateBook } from '@/api/placement/resumeBooks'

export function ResumeBookCreatePage() {
  const router = useRouter()
  const { base } = usePlacementPaths()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [branch, setBranch] = useState('')
  const [batch, setBatch] = useState('')
  const [minReadiness, setMinReadiness] = useState('')
  const [limit, setLimit] = useState('50')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!base) return
    setSaving(true)
    setError(null)
    try {
      const book = await generateBook({
        title,
        description,
        bookType: 'readiness_based',
        filters: {
          branch: branch || undefined,
          batch: batch || undefined,
          minReadinessScore: minReadiness ? Number(minReadiness) : undefined,
          limit: limit ? Number(limit) : undefined,
        },
      })
      router.history.push(`${base}/resume-books/${book.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate book')
    } finally {
      setSaving(false)
    }
  }

  return (
    <PlacementShell title="Create Resume Book">
      <PlacementPageHeader
        title="Create resume book"
        description="Generate a snapshot book from student filters."
        actions={
          base ? (
            <Button asChild variant="outline" size="sm">
              <PlacementLink href={`${base}/resume-books`}>Cancel</PlacementLink>
            </Button>
          ) : null
        }
      />

      {error ? <div className="mb-4"><PlacementErrorAlert message={error} /></div> : null}

      <Card className="term-window border-border bg-card/80">
        <CardHeader className="border-b border-border">
          <CardTitle className="text-base">Book settings</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <form onSubmit={handleSubmit} className="grid max-w-xl gap-4">
            <label className="text-sm">
              <span className="text-muted-foreground">Title *</span>
              <Input required className="mt-1 border-border bg-card" value={title} onChange={(e) => setTitle(e.target.value)} />
            </label>
            <label className="text-sm">
              <span className="text-muted-foreground">Description</span>
              <Input className="mt-1 border-border bg-card" value={description} onChange={(e) => setDescription(e.target.value)} />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm">
                <span className="text-muted-foreground">Branch filter</span>
                <Input className="mt-1 border-border bg-card" value={branch} onChange={(e) => setBranch(e.target.value)} />
              </label>
              <label className="text-sm">
                <span className="text-muted-foreground">Batch filter</span>
                <Input className="mt-1 border-border bg-card" value={batch} onChange={(e) => setBatch(e.target.value)} />
              </label>
              <label className="text-sm">
                <span className="text-muted-foreground">Min readiness score</span>
                <Input type="number" className="mt-1 border-border bg-card" value={minReadiness} onChange={(e) => setMinReadiness(e.target.value)} />
              </label>
              <label className="text-sm">
                <span className="text-muted-foreground">Max students</span>
                <Input type="number" className="mt-1 border-border bg-card" value={limit} onChange={(e) => setLimit(e.target.value)} />
              </label>
            </div>
            <Button type="submit" disabled={saving}>{saving ? 'Generating…' : 'Generate book'}</Button>
          </form>
        </CardContent>
      </Card>
    </PlacementShell>
  )
}
