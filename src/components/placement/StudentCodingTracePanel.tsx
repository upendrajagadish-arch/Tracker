import { useEffect, useState } from 'react'
import { PlatformIcon } from '@/components/PlatformIcon'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PlacementEmptyState, PlacementErrorAlert, PlacementLoadingBlock } from '@/components/placement/PlacementStates'
import type { StudentProfileRow } from '@/api/placement/students'
import { fetchStudentCodingTrace, type StudentCodingTraceResult } from '@/lib/studentCodingTrace'
import { resolvePlatformHandles } from '@/lib/studentPlatformHandles'
import { ALL_PLATFORMS } from '@/api/unifiedClient'
import { BRAND_NAME } from '@/lib/brand'

interface StudentCodingTracePanelProps {
  student: StudentProfileRow
}

export function StudentCodingTracePanel({ student }: StudentCodingTracePanelProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [trace, setTrace] = useState<StudentCodingTraceResult | null>(null)

  const handles = resolvePlatformHandles(student)
  const hasHandles = ALL_PLATFORMS.some((p) => handles[p]?.trim())

  useEffect(() => {
    if (!hasHandles) {
      setLoading(false)
      return
    }
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchStudentCodingTrace(student)
        setTrace(data)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load coding trace')
      } finally {
        setLoading(false)
      }
    })()
  }, [student, hasHandles])

  if (!hasHandles) {
    return (
      <PlacementEmptyState
        title="No platform handles"
        description="Add coding platform usernames on the student edit form to build a live coding trace."
      />
    )
  }

  if (loading) return <PlacementLoadingBlock />
  if (error) return <PlacementErrorAlert message={error} />
  if (!trace) return null

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="term-window border-border bg-card/80">
          <CardContent className="pt-4">
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Platforms linked</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{trace.linkedCount}</p>
          </CardContent>
        </Card>
        <Card className="term-window border-border bg-card/80">
          <CardContent className="pt-4">
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Total solved</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{trace.totalSolved}</p>
          </CardContent>
        </Card>
        <Card className="term-window border-border bg-card/80 sm:col-span-1">
          <CardContent className="pt-4">
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Data source</p>
            <p className="mt-1 text-sm text-foreground">Live {BRAND_NAME} APIs</p>
          </CardContent>
        </Card>
      </div>

      <Card className="term-window border-border bg-card/80">
        <CardHeader className="border-b border-border">
          <CardTitle className="text-base">Platform breakdown</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-border pt-0">
          {trace.platforms.map((entry) => (
            <div key={entry.platform} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
              <div className="flex items-center gap-2">
                <PlatformIcon platform={entry.platform} className="size-4" />
                <span className="font-medium capitalize">{entry.platform}</span>
                <span className="font-mono text-xs text-muted-foreground">@{entry.username}</span>
              </div>
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span>Solved: <strong className="text-foreground">{entry.totalSolved}</strong></span>
                {entry.currentRating != null ? (
                  <span>Rating: <strong className="text-foreground">{entry.currentRating}</strong></span>
                ) : null}
                {entry.maxRating != null ? (
                  <span>Max: <strong className="text-foreground">{entry.maxRating}</strong></span>
                ) : null}
                {entry.error ? <span className="text-destructive">{entry.error}</span> : null}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
