import { useEffect, useState } from 'react'
import { useParams } from '@tanstack/react-router'
import { SeoHead } from '@/components/SeoHead'
import { Card, CardContent } from '@/components/ui/card'
import { ProfilePage } from '@/pages/ProfilePage'
import { PlacementLoadingBlock } from '@/components/placement/PlacementStates'
import { getPublicStudentPerformance } from '@/api/placement/studentShare'
import {
  platformHandlesToUsernames,
  resolvePlatformHandles,
} from '@/lib/studentPlatformHandles'
import type { StudentProfileRow } from '@/api/placement/students'
import { ALL_PLATFORMS } from '@/api/unifiedClient'

function MinimalPerformanceCard({
  fullName,
  rollNumber,
  branch,
  batch,
  cgpa,
  readinessScore,
  readinessStatus,
  placementStatus,
  skillsSummary,
  careerInterest,
  totalSolved,
  linkedCount,
}: {
  fullName: string
  rollNumber: string
  branch: string
  batch: string
  cgpa: number | null
  readinessScore: number
  readinessStatus: string
  placementStatus: string
  skillsSummary: string
  careerInterest: string
  totalSolved: number
  linkedCount: number
}) {
  return (
    <Card className="term-window mx-auto max-w-2xl border-border bg-card/80">
      <CardContent className="space-y-4 py-8">
        <div className="text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">Student performance</p>
          <h1 className="mt-3 font-pixel text-3xl text-foreground">{fullName}</h1>
          <p className="mt-2 font-mono text-sm text-muted-foreground">
            {rollNumber} · {branch || '—'} · {batch || '—'}
          </p>
        </div>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-md border border-border bg-background/40 px-3 py-2">
            <dt className="text-muted-foreground">CGPA</dt>
            <dd className="font-medium text-foreground">{cgpa ?? '—'}</dd>
          </div>
          <div className="rounded-md border border-border bg-background/40 px-3 py-2">
            <dt className="text-muted-foreground">Readiness</dt>
            <dd className="font-medium text-foreground">{readinessScore} · {readinessStatus.replace(/_/g, ' ')}</dd>
          </div>
          <div className="rounded-md border border-border bg-background/40 px-3 py-2">
            <dt className="text-muted-foreground">Placement</dt>
            <dd className="font-medium text-foreground">{placementStatus.replace(/_/g, ' ')}</dd>
          </div>
          <div className="rounded-md border border-border bg-background/40 px-3 py-2">
            <dt className="text-muted-foreground">Coding platforms</dt>
            <dd className="font-medium text-foreground">{linkedCount} linked · {totalSolved} solved</dd>
          </div>
        </dl>
        {skillsSummary ? (
          <p className="text-sm text-muted-foreground"><span className="text-foreground">Skills:</span> {skillsSummary}</p>
        ) : null}
        {careerInterest ? (
          <p className="text-sm text-muted-foreground"><span className="text-foreground">Interest:</span> {careerInterest}</p>
        ) : null}
      </CardContent>
    </Card>
  )
}

export function PublicStudentPerformancePage() {
  const { token } = useParams({ strict: false }) as { token: string }
  const [profile, setProfile] = useState<Awaited<ReturnType<typeof getPublicStudentPerformance>>>(null)
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
        const res = await getPublicStudentPerformance(token)
        if (!res) {
          setError('Invalid or expired link')
          return
        }
        setProfile(res)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load student profile')
      } finally {
        setLoading(false)
      }
    })()
  }, [token])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <PlacementLoadingBlock label="Loading student performance…" />
      </div>
    )
  }

  if (error || !profile) {
    return (
      <>
        <SeoHead title="Student profile unavailable" />
        <div className="flex min-h-screen items-center justify-center bg-background p-6">
          <Card className="max-w-md term-window border-border bg-card/80">
            <CardContent className="py-8 text-center">
              <h1 className="font-pixel text-lg text-foreground">Student profile unavailable</h1>
              <p className="mt-2 font-mono text-sm text-muted-foreground">{error || 'Invalid or expired link'}</p>
            </CardContent>
          </Card>
        </div>
      </>
    )
  }

  const pseudoStudent = {
    github_url: '',
    platform_handles: profile.platformHandles,
  } as Pick<StudentProfileRow, 'github_url' | 'platform_handles'>
  const handles = resolvePlatformHandles(pseudoStudent)
  const hasHandles = ALL_PLATFORMS.some((platform) => handles[platform]?.trim())
  const usernames = platformHandlesToUsernames(handles)
  const hasCards = profile.cards.length > 0

  return (
    <>
      <SeoHead
        title={`${profile.fullName} — Student Performance`}
        description={`Placement performance profile for ${profile.fullName}`}
      />
      <div className="min-h-screen bg-background">
        {hasHandles && hasCards ? (
          <ProfilePage
            usernames={usernames}
            owner={{
              username: profile.rollNumber,
              displayName: profile.fullName,
              avatarUrl: null,
            }}
            mode="placement"
            profileLabel="student performance"
            subtitle={`${profile.branch || '—'} · ${profile.batch || '—'} · readiness ${profile.readinessScore}`}
            hideShare
            hideFooter
            prefetchedCards={profile.cards}
            publicView
          />
        ) : (
          <div className="px-4 py-10 md:px-8">
            <MinimalPerformanceCard
              fullName={profile.fullName}
              rollNumber={profile.rollNumber}
              branch={profile.branch}
              batch={profile.batch}
              cgpa={profile.cgpa}
              readinessScore={profile.readinessScore}
              readinessStatus={profile.readinessStatus}
              placementStatus={profile.placementStatus}
              skillsSummary={profile.skillsSummary}
              careerInterest={profile.careerInterest}
              totalSolved={profile.totalSolved}
              linkedCount={profile.linkedCount}
            />
          </div>
        )}
      </div>
    </>
  )
}
