import { useCallback, useEffect, useState } from 'react'
import { QrCode, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { prepareStudentShareLink, publicStudentPerformanceUrl } from '@/api/placement/studentShare'
import type { StudentProfileRow } from '@/api/placement/students'
import { shareOrCopyUrl } from '@/lib/utils'

interface StudentPerformanceShareProps {
  student: Pick<StudentProfileRow, 'id' | 'github_url' | 'platform_handles' | 'full_name'>
  onShareUrl?: (url: string | null) => void
}

function QrCodeImage({ url, size = 168 }: { url: string; size?: number }) {
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}`
  return (
    <img
      src={src}
      alt="QR code for student performance link"
      width={size}
      height={size}
      className="rounded-md border border-border bg-white p-2"
    />
  )
}

export function StudentPerformanceShare({
  student,
  onShareUrl,
}: StudentPerformanceShareProps) {
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const loadShareUrl = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const token = await prepareStudentShareLink(student)
      const url = publicStudentPerformanceUrl(token)
      setShareUrl(url)
      onShareUrl?.(url)
      return url
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to create share link'
      setError(message)
      onShareUrl?.(null)
      return null
    } finally {
      setLoading(false)
    }
  }, [onShareUrl, student])

  useEffect(() => {
    void loadShareUrl()
  }, [loadShareUrl])

  const handleOpen = async () => {
    const url = shareUrl ?? await loadShareUrl()
    if (url) setOpen(true)
  }

  const handleCopy = async () => {
    const url = shareUrl ?? await loadShareUrl()
    if (!url) return
    const result = await shareOrCopyUrl(url, `${student.full_name} — Student Performance`)
    if (result === 'copied' || result === 'shared') {
      setToast('Public link copied')
      setTimeout(() => setToast(null), 2000)
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={loading}
        onClick={() => void handleOpen()}
      >
        <Share2 data-icon="inline-start" className="size-3.5" />
        {loading ? 'Preparing link…' : 'Share performance'}
      </Button>

      {error ? (
        <span className="font-mono text-[10px] text-destructive">{error}</span>
      ) : null}

      {toast ? (
        <span className="font-mono text-[10px] text-primary">{toast}</span>
      ) : null}

      {open && shareUrl ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-md term-window border-border bg-card">
            <CardContent className="space-y-4 pt-6">
              <div className="text-center">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">Public student performance</p>
                <h2 className="mt-2 font-pixel text-xl text-foreground">{student.full_name}</h2>
                <p className="mt-1 text-xs text-muted-foreground">Opens without login — performance card only</p>
              </div>

              <div className="flex justify-center">
                <QrCodeImage url={shareUrl} />
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <QrCode className="size-3.5 shrink-0" />
                <span>Scan or copy the link to open this student&apos;s performance card</span>
              </div>

              <Input readOnly value={shareUrl} className="border-border bg-background font-mono text-xs" />

              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" onClick={() => void handleCopy()}>
                  Copy public link
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => shareUrl && window.open(shareUrl, '_blank', 'noopener,noreferrer')}
                >
                  Open preview
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setOpen(false)}>
                  Close
                </Button>
              </div>

              {error ? <p className="text-xs text-destructive">{error}</p> : null}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </>
  )
}
