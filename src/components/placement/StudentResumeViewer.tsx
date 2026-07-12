import { useCallback, useEffect, useState } from 'react'
import { Download, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PlacementEmptyState, PlacementErrorAlert, PlacementLoadingBlock } from '@/components/placement/PlacementStates'
import { getActiveResume, getResumeDownloadUrl } from '@/api/placement/resumes'

interface StudentResumeViewerProps {
  studentProfileId: string
  canUpload?: boolean
  uploadHref?: string
}

export function StudentResumeViewer({ studentProfileId, canUpload, uploadHref }: StudentResumeViewerProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [viewUrl, setViewUrl] = useState<string | null>(null)
  const [mimeType, setMimeType] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    setViewUrl(null)
    try {
      const resume = await getActiveResume(studentProfileId)
      if (!resume) {
        setFileName(null)
        return
      }
      setFileName(resume.file_name)
      setMimeType(resume.mime_type)
      const url = await getResumeDownloadUrl(resume.id)
      setViewUrl(url)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load resume')
    } finally {
      setLoading(false)
    }
  }, [studentProfileId])

  useEffect(() => {
    void load()
  }, [load])

  const handleDownload = () => {
    if (!viewUrl || !fileName) return
    const anchor = document.createElement('a')
    anchor.href = viewUrl
    anchor.download = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`
    anchor.target = '_blank'
    anchor.rel = 'noreferrer'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
  }

  const isPdf = mimeType?.includes('pdf') || fileName?.toLowerCase().endsWith('.pdf')

  if (loading) return <PlacementLoadingBlock />
  if (error) return <PlacementErrorAlert message={error} />

  if (!viewUrl || !fileName) {
    return (
      <PlacementEmptyState
        title="No resume on file"
        description="Upload a PDF resume from the student edit form or resumes module."
        action={
          canUpload && uploadHref ? (
            <Button asChild variant="outline" size="sm">
              <a href={uploadHref}>Go to resumes</a>
            </Button>
          ) : undefined
        }
      />
    )
  }

  return (
    <Card className="term-window border-border bg-card/80">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="size-4" />
          {fileName}
        </CardTitle>
        <Button variant="outline" size="sm" onClick={handleDownload}>
          <Download className="size-3.5" />
          Download PDF
        </Button>
      </CardHeader>
      <CardContent className="pt-4">
        {isPdf ? (
          <iframe
            title={`Resume: ${fileName}`}
            src={viewUrl}
            className="h-[min(70vh,640px)] w-full rounded-md border border-border bg-background"
          />
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Preview is available for PDF files. Use download to open this file.
            </p>
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="size-3.5" />
              Download file
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
