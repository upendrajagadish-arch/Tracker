import { useEffect, useState } from 'react'
import { useParams } from '@tanstack/react-router'
import { SeoHead } from '@/components/SeoHead'
import { Card, CardContent } from '@/components/ui/card'
import { PublicStudentPerformanceCard } from '@/components/placement/PublicStudentPerformanceCard'
import { PlacementLoadingBlock } from '@/components/placement/PlacementStates'
import { getPublicStudentPerformance } from '@/api/placement/studentShare'

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
          setError('This share link is invalid or has been turned off.')
          return
        }
        setProfile(res)
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Failed to load student profile'
        if (/get_public_student_performance|schema cache|function/i.test(message)) {
          setError('Share links are not enabled on the server yet. Ask your admin to run scripts/apply-student-share-migration.sql in Supabase.')
        } else {
          setError(message)
        }
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

  return (
    <>
      <SeoHead
        title={`${profile.fullName} — Student Performance`}
        description={`Placement performance profile for ${profile.fullName}`}
      />
      <div className="min-h-screen bg-background">
        <PublicStudentPerformanceCard profile={profile} />
      </div>
    </>
  )
}
