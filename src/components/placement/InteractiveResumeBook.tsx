import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

/** Students loaded per API request — do not render all entries at once. */
export const CHUNK_SIZE = 10

export interface ResumeBookStudent {
  id?: string
  order?: number
  fullName?: string
  rollNumber?: string
  branch?: string
  batch?: string
  cgpa?: number | null
  activeBacklogs?: number
  readinessScore?: number | null
  readinessStatus?: string
  placementStatus?: string
  linkedinUrl?: string
  githubUrl?: string
  portfolioUrl?: string
  topSkills?: string[]
  verifiedSkills?: string[]
  resumeId?: string
  resumeDownloadUrl?: string
  codingSummary?: { overallScore?: number; connectedCount?: number }
  interviewSummary?: { count?: number; avgTechnical?: number }
  companyFitSummary?: { companyName?: string; matchScore?: number }
  projectSummary?: string
}

export interface ResumeBookShareSettings {
  allowResumeDownload?: boolean
  allowExternalLinks?: boolean
}

export interface ResumeBookStudentsPage {
  students: ResumeBookStudent[]
  pagination?: { page: number; limit: number; total: number; pages: number }
}

function pruneCache(cache: Record<number, ResumeBookStudent>, centerIndex: number, total: number) {
  const chunkStart = Math.floor(centerIndex / CHUNK_SIZE) * CHUNK_SIZE
  const minKeep = Math.max(0, chunkStart - CHUNK_SIZE)
  const maxKeep = Math.min(Math.max(total - 1, 0), chunkStart + CHUNK_SIZE * 2 - 1)
  const next: Record<number, ResumeBookStudent> = {}
  Object.keys(cache).forEach((key) => {
    const idx = Number(key)
    if (idx >= minKeep && idx <= maxKeep) next[idx] = cache[idx]
  })
  return next
}

function StudentSpread({
  student,
  shareSettings,
  isPublic,
  onDownload,
}: {
  student?: ResumeBookStudent | null
  shareSettings?: ResumeBookShareSettings
  isPublic?: boolean
  onDownload: (student: ResumeBookStudent) => void
}) {
  if (!student) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Loading…
      </div>
    )
  }

  const showLinks = !isPublic || shareSettings?.allowExternalLinks !== false
  const showResume = isPublic
    ? Boolean(shareSettings?.allowResumeDownload && student.resumeDownloadUrl)
    : Boolean(student.resumeDownloadUrl)

  return (
    <div className="grid h-full grid-cols-1 gap-4 overflow-hidden md:grid-cols-2">
      <div className="book-page-left space-y-3 overflow-hidden p-4">
        <h3 className="truncate text-xl font-bold text-foreground" title={student.fullName}>
          {student.fullName}
        </h3>
        <p className="truncate text-sm text-muted-foreground">{student.rollNumber}</p>
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between gap-2 border-b border-border py-1">
            <dt className="shrink-0 text-muted-foreground">Branch / Batch</dt>
            <dd className="truncate text-right">{student.branch} / {student.batch}</dd>
          </div>
          <div className="flex justify-between border-b border-border py-1">
            <dt className="text-muted-foreground">CGPA</dt>
            <dd>{student.cgpa ?? '—'}</dd>
          </div>
          <div className="flex justify-between border-b border-border py-1">
            <dt className="text-muted-foreground">Backlogs</dt>
            <dd>{student.activeBacklogs ?? 0}</dd>
          </div>
          <div className="flex justify-between gap-2 border-b border-border py-1">
            <dt className="shrink-0 text-muted-foreground">Readiness</dt>
            <dd className="truncate text-right">
              {student.readinessScore ?? '—'}
              {student.readinessStatus ? ` (${student.readinessStatus.replace(/_/g, ' ')})` : ''}
            </dd>
          </div>
          <div className="flex justify-between gap-2 border-b border-border py-1">
            <dt className="shrink-0 text-muted-foreground">Placement</dt>
            <dd className="truncate text-right">{student.placementStatus?.replace(/_/g, ' ') || '—'}</dd>
          </div>
        </dl>
        {showLinks ? (
          <div className="flex flex-wrap gap-2 pt-2 text-xs">
            {student.linkedinUrl ? (
              <a href={student.linkedinUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                LinkedIn
              </a>
            ) : null}
            {student.githubUrl ? (
              <a href={student.githubUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                GitHub
              </a>
            ) : null}
            {student.portfolioUrl ? (
              <a href={student.portfolioUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                Portfolio
              </a>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="book-page-right space-y-3 overflow-hidden border-t border-primary/30 p-4 md:border-t-0 md:border-l">
        <div>
          <p className="text-xs font-semibold uppercase text-muted-foreground">Skills</p>
          <p className="mt-1 line-clamp-3 text-sm break-words">
            {student.topSkills?.length ? student.topSkills.join(', ') : '—'}
          </p>
          {student.verifiedSkills && student.verifiedSkills.length > 0 ? (
            <p className="mt-1 line-clamp-2 text-xs text-primary">
              Verified: {student.verifiedSkills.join(', ')}
            </p>
          ) : null}
        </div>
        {student.codingSummary?.overallScore != null ? (
          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground">Coding</p>
            <p className="text-sm">
              Score {student.codingSummary.overallScore}
              {student.codingSummary.connectedCount ? ` · ${student.codingSummary.connectedCount} platforms` : ''}
            </p>
          </div>
        ) : (
          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground">Coding</p>
            <p className="text-sm text-muted-foreground">No coding profile linked</p>
          </div>
        )}
        {student.interviewSummary && student.interviewSummary.count != null && student.interviewSummary.count > 0 ? (
          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground">Interviews</p>
            <p className="text-sm">
              {student.interviewSummary.count} mocks
              {student.interviewSummary.avgTechnical != null ? ` · Tech ${student.interviewSummary.avgTechnical}` : ''}
            </p>
          </div>
        ) : null}
        {student.companyFitSummary?.matchScore != null ? (
          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground">Company fit</p>
            <p className="truncate text-sm">
              {student.companyFitSummary.companyName} — {student.companyFitSummary.matchScore}
            </p>
          </div>
        ) : null}
        {student.projectSummary ? (
          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground">Projects</p>
            <p className="line-clamp-4 text-sm break-words text-muted-foreground">{student.projectSummary}</p>
          </div>
        ) : null}
        {!student.resumeId && !student.resumeDownloadUrl ? (
          <p className="text-xs text-muted-foreground">No resume on file</p>
        ) : null}
        {showResume ? (
          <Button type="button" size="sm" onClick={() => onDownload(student)}>
            Download resume
          </Button>
        ) : null}
      </div>
    </div>
  )
}

function PaginatedListView({
  fetchStudents,
  shareSettings,
  isPublic,
  onDownload,
}: {
  totalStudents: number
  fetchStudents: (page: number, limit: number) => Promise<ResumeBookStudentsPage>
  shareSettings?: ResumeBookShareSettings
  isPublic?: boolean
  onDownload: (student: ResumeBookStudent) => void
}) {
  const [page, setPage] = useState(1)
  const [students, setStudents] = useState<ResumeBookStudent[]>([])
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetchStudents(page, CHUNK_SIZE)
        if (!cancelled) {
          setStudents(res.students || [])
          setPages(res.pagination?.pages || 1)
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load students')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [page, fetchStudents])

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="size-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-destructive/40 bg-destructive/10">
        <CardContent className="py-4 text-sm text-destructive">{error}</CardContent>
      </Card>
    )
  }

  if (!students.length) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No students in this resume book.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4 p-4">
      {students.map((s) => (
        <Card key={s.id || s.order || s.rollNumber} className="overflow-hidden border-border">
          <CardContent className="p-0">
            <StudentSpread student={s} shareSettings={shareSettings} isPublic={isPublic} onDownload={onDownload} />
          </CardContent>
        </Card>
      ))}
      <div className="flex items-center justify-between gap-2 pt-2">
        <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
          ← Previous page
        </Button>
        <span className="text-xs text-muted-foreground">Page {page} of {pages}</span>
        <Button type="button" variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
          Next page →
        </Button>
      </div>
    </div>
  )
}

export interface InteractiveResumeBookProps {
  title: string
  totalStudents: number
  fetchStudents: (page: number, limit: number) => Promise<ResumeBookStudentsPage>
  shareSettings?: ResumeBookShareSettings
  isPublic?: boolean
  onDownloadResume?: (student: ResumeBookStudent) => void
  autoOpen?: boolean
}

export function InteractiveResumeBook({
  title,
  totalStudents,
  fetchStudents,
  shareSettings = {},
  isPublic = false,
  onDownloadResume,
  autoOpen = false,
}: InteractiveResumeBookProps) {
  const [isOpen, setIsOpen] = useState(autoOpen)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [flipDir, setFlipDir] = useState('')
  const [cache, setCache] = useState<Record<number, ResumeBookStudent>>({})
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [mobileList, setMobileList] = useState(false)
  const cacheRef = useRef<Record<number, ResumeBookStudent>>({})

  useEffect(() => {
    if (autoOpen && totalStudents > 0) setIsOpen(true)
  }, [autoOpen, totalStudents])

  const loadStudent = useCallback(
    async (index: number) => {
      if (index < 0 || index >= totalStudents) return null
      if (cacheRef.current[index]) return cacheRef.current[index]

      const page = Math.floor(index / CHUNK_SIZE) + 1
      const offset = (page - 1) * CHUNK_SIZE
      const localIndex = index - offset
      setLoading(true)
      setFetchError(null)
      try {
        const res = await fetchStudents(page, CHUNK_SIZE)
        const batch = res.students || []
        setCache((prev) => {
          const merged = { ...prev }
          batch.forEach((s, i) => {
            merged[offset + i] = s
          })
          const pruned = pruneCache(merged, index, totalStudents)
          cacheRef.current = pruned
          return pruned
        })
        return batch[localIndex] || null
      } catch (e) {
        setFetchError(e instanceof Error ? e.message : 'Failed to load students')
        return null
      } finally {
        setLoading(false)
      }
    },
    [fetchStudents, totalStudents],
  )

  useEffect(() => {
    cacheRef.current = cache
  }, [cache])

  useEffect(() => {
    if (!isOpen || totalStudents === 0) return
    void loadStudent(currentIndex)
    if (currentIndex > 0) void loadStudent(currentIndex - 1)
    if (currentIndex < totalStudents - 1) void loadStudent(currentIndex + 1)
  }, [isOpen, currentIndex, totalStudents, loadStudent])

  const goNext = useCallback(() => {
    if (currentIndex >= totalStudents - 1) return
    setFlipDir('forward')
    setCurrentIndex((i) => i + 1)
    setTimeout(() => setFlipDir(''), 400)
  }, [currentIndex, totalStudents])

  const goPrev = useCallback(() => {
    if (currentIndex <= 0) return
    setFlipDir('backward')
    setCurrentIndex((i) => i - 1)
    setTimeout(() => setFlipDir(''), 400)
  }, [currentIndex])

  const closeBook = useCallback(() => {
    setIsOpen(false)
    setCurrentIndex(0)
    setFetchError(null)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!isOpen) return
      if (e.key === 'ArrowRight') goNext()
      if (e.key === 'ArrowLeft') goPrev()
      if (e.key === 'Escape') closeBook()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, goNext, goPrev, closeBook])

  const handleDownload = (student: ResumeBookStudent) => {
    if (onDownloadResume) {
      onDownloadResume(student)
      return
    }
    if (student.resumeDownloadUrl) {
      window.open(student.resumeDownloadUrl, '_blank', 'noopener,noreferrer')
    }
  }

  const currentStudent = cache[currentIndex]

  if (totalStudents === 0) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          This resume book has no students.
        </CardContent>
      </Card>
    )
  }

  if (typeof window !== 'undefined' && window.innerWidth < 768 && mobileList) {
    return (
      <div>
        <Button type="button" variant="outline" size="sm" className="mb-4" onClick={() => setMobileList(false)}>
          Open book view
        </Button>
        <PaginatedListView
          totalStudents={totalStudents}
          fetchStudents={fetchStudents}
          shareSettings={shareSettings}
          isPublic={isPublic}
          onDownload={handleDownload}
        />
      </div>
    )
  }

  if (!isOpen) {
    return (
      <div className="flex flex-col items-center py-12">
        <div
          className="resume-book-cover cursor-pointer rounded-lg px-12 py-16 text-center shadow-xl transition-transform hover:scale-[1.02]"
          onClick={() => setIsOpen(true)}
          onKeyDown={(e) => e.key === 'Enter' && setIsOpen(true)}
          role="button"
          tabIndex={0}
        >
          <p className="text-xs uppercase tracking-widest text-primary">Placement Resume Book</p>
          <h2 className="mt-4 line-clamp-2 font-serif text-3xl font-bold text-white">{title}</h2>
          <p className="mt-2 text-muted-foreground">{totalStudents} students</p>
          <p className="mt-6 text-sm text-primary">Click to open</p>
        </div>
        <Button type="button" variant="outline" size="sm" className="mt-6 md:hidden" onClick={() => setMobileList(true)}>
          Simple list view
        </Button>
      </div>
    )
  }

  return (
    <div className="resume-book-open mx-auto max-w-5xl overflow-hidden">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Student {currentIndex + 1} of {totalStudents}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={goPrev} disabled={currentIndex === 0}>
            ← Previous
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={goNext} disabled={currentIndex >= totalStudents - 1}>
            Next →
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={closeBook}>
            Close book
          </Button>
        </div>
      </div>

      {fetchError ? (
        <Card className="mb-4 border-destructive/40 bg-destructive/10">
          <CardContent className="py-3 text-sm text-destructive">{fetchError}</CardContent>
        </Card>
      ) : null}

      <div
        className={`resume-book-spread min-h-[420px] overflow-hidden rounded-lg bg-card/80 shadow-inner transition-transform duration-300 ${
          flipDir === 'forward' ? 'book-flip-forward' : flipDir === 'backward' ? 'book-flip-backward' : ''
        }`}
      >
        {loading && !currentStudent ? (
          <div className="flex h-96 items-center justify-center">
            <div className="size-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
          </div>
        ) : (
          <StudentSpread
            student={currentStudent}
            shareSettings={shareSettings}
            isPublic={isPublic}
            onDownload={handleDownload}
          />
        )}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-4 w-full md:hidden"
        onClick={() => {
          setMobileList(true)
          setIsOpen(false)
        }}
      >
        Switch to list view
      </Button>
    </div>
  )
}
