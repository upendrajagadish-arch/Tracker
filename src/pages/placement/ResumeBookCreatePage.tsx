import { useEffect, useMemo, useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { PlacementLink } from '@/components/placement/PlacementLink'
import { ResumeBookCreatePreview } from '@/components/placement/ResumeBookCreatePreview'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { PlacementShell, usePlacementPaths } from '@/components/placement/PlacementShell'
import { PlacementPageHeader } from '@/components/placement/PlacementPageHeader'
import { PlacementErrorAlert } from '@/components/placement/PlacementStates'
import {
  generateBook,
  listResumeBookFilterOptions,
  previewBookStudents,
  type ResumeBookFilters,
  type ResumeBookPreviewResult,
} from '@/api/placement/resumeBooks'

const EMPTY_PREVIEW: ResumeBookPreviewResult = { total: 0, cappedTotal: 0, sample: [] }

export function ResumeBookCreatePage() {
  const router = useRouter()
  const { base } = usePlacementPaths()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [branch, setBranch] = useState('')
  const [batch, setBatch] = useState('')
  const [minReadiness, setMinReadiness] = useState('')
  const [limit, setLimit] = useState('50')
  const [branches, setBranches] = useState<string[]>([])
  const [batches, setBatches] = useState<string[]>([])
  const [preview, setPreview] = useState<ResumeBookPreviewResult>(EMPTY_PREVIEW)
  const [previewLoading, setPreviewLoading] = useState(true)
  const [optionsLoading, setOptionsLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const filters = useMemo<ResumeBookFilters>(() => ({
    branch: branch || undefined,
    batch: batch || undefined,
    minReadinessScore: minReadiness ? Number(minReadiness) : undefined,
    limit: limit ? Number(limit) : undefined,
  }), [branch, batch, minReadiness, limit])

  useEffect(() => {
    void (async () => {
      setOptionsLoading(true)
      try {
        const options = await listResumeBookFilterOptions()
        setBranches(options.branches)
        setBatches(options.batches)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load filter options')
      } finally {
        setOptionsLoading(false)
      }
    })()
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void (async () => {
        setPreviewLoading(true)
        try {
          setPreview(await previewBookStudents(filters))
        } catch (e) {
          setPreview(EMPTY_PREVIEW)
          setError(e instanceof Error ? e.message : 'Failed to preview students')
        } finally {
          setPreviewLoading(false)
        }
      })()
    }, 300)
    return () => window.clearTimeout(timer)
  }, [filters])

  const canGenerate = preview.cappedTotal > 0 && title.trim().length > 0 && !saving

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!base || !canGenerate) return
    setSaving(true)
    setError(null)
    try {
      const book = await generateBook({
        title,
        description,
        bookType: 'readiness_based',
        filters,
      })
      router.history.push(`${base}/resume-books/${book.id}?open=1`)
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
        description="Set filters, preview matching students, then generate an animated snapshot book."
        actions={
          base ? (
            <Button asChild variant="outline" size="sm">
              <PlacementLink href={`${base}/resume-books`}>Cancel</PlacementLink>
            </Button>
          ) : null
        }
      />

      {error ? <div className="mb-4"><PlacementErrorAlert message={error} /></div> : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
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
                  <span className="text-muted-foreground">Branch</span>
                  <select
                    className="mt-1 flex h-9 w-full rounded-md border border-border bg-card px-3 text-sm"
                    value={branch}
                    disabled={optionsLoading}
                    onChange={(e) => setBranch(e.target.value)}
                  >
                    <option value="">All branches</option>
                    {branches.map((value) => (
                      <option key={value} value={value}>{value}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  <span className="text-muted-foreground">Batch / year</span>
                  <select
                    className="mt-1 flex h-9 w-full rounded-md border border-border bg-card px-3 text-sm"
                    value={batch}
                    disabled={optionsLoading}
                    onChange={(e) => setBatch(e.target.value)}
                  >
                    <option value="">All batches</option>
                    {batches.map((value) => (
                      <option key={value} value={value}>{value}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  <span className="text-muted-foreground">Min readiness score</span>
                  <Input
                    type="number"
                    min={0}
                    placeholder="Optional"
                    className="mt-1 border-border bg-card"
                    value={minReadiness}
                    onChange={(e) => setMinReadiness(e.target.value)}
                  />
                </label>
                <label className="text-sm">
                  <span className="text-muted-foreground">Max students</span>
                  <Input type="number" min={1} max={500} className="mt-1 border-border bg-card" value={limit} onChange={(e) => setLimit(e.target.value)} />
                </label>
              </div>
              <Button type="submit" disabled={!canGenerate}>
                {saving ? 'Generating book…' : `Generate book (${preview.cappedTotal || 0} students)`}
              </Button>
              {!previewLoading && preview.cappedTotal === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Add students under Students first, or widen filters to include them.
                </p>
              ) : null}
            </form>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50">
          <CardHeader className="border-b border-border pb-3">
            <CardTitle className="text-base">Live preview</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <ResumeBookCreatePreview
              title={title}
              total={preview.total}
              cappedTotal={preview.cappedTotal}
              sample={preview.sample}
              loading={previewLoading}
              generating={saving}
            />
          </CardContent>
        </Card>
      </div>
    </PlacementShell>
  )
}
