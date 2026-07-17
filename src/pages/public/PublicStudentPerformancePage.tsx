import { useEffect, useState } from 'react'
import { useParams } from '@tanstack/react-router'
import { SeoHead } from '@/components/SeoHead'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PublicStudentPerformanceCard } from '@/components/placement/PublicStudentPerformanceCard'
import { PlacementLoadingBlock } from '@/components/placement/PlacementStates'
import { getPublicStudentPerformance } from '@/api/placement/studentShare'
import { downloadStudentPerformancePdf } from '@/lib/downloadStudentPerformancePdf'

export function PublicStudentPerformancePage() {
  const { token } = useParams({ strict: false }) as { token: string }
  const [profile, setProfile] = useState<Awaited<ReturnType<typeof getPublicStudentPerformance>>>(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
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
          setError(
            'Share links need a database update. Ask your admin to run scripts/apply-aptitude-verbal-enhanced-share-migration.sql (and the student share migration if never applied) in Supabase.',
          )
        } else {
          setError(message)
        }
      } finally {
        setLoading(false)
      }
    })()
  }, [token])

  const handleDownloadPdf = async () => {
    if (!profile) return
    setDownloading(true)
    try {
      await downloadStudentPerformancePdf(profile)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to download PDF')
    } finally {
      setDownloading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-16">
        <PlacementLoadingBlock label="Loading student performance…" />
      </div>
    )
  }

  if (error || !profile) {
    return (
      <>
        <SeoHead title="Student profile unavailable" />
        <div className="flex flex-1 items-center justify-center p-6">
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
      <div className="flex-1 py-2">
        <div className="mx-auto flex max-w-5xl justify-end px-4 pt-4 sm:px-6 md:px-8">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={downloading}
            onClick={() => void handleDownloadPdf()}
          >
            {downloading ? 'Preparing PDF…' : 'Download PDF'}
          </Button>
        </div>
        <PublicStudentPerformanceCard profile={profile} />
      </div>
    </>
  )
}
