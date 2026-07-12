import type { ResumeBookPreviewStudent } from '@/api/placement/resumeBooks'

export interface ResumeBookCreatePreviewProps {
  title: string
  total: number
  cappedTotal: number
  sample: ResumeBookPreviewStudent[]
  loading?: boolean
  generating?: boolean
}

export function ResumeBookCreatePreview({
  title,
  total,
  cappedTotal,
  sample,
  loading = false,
  generating = false,
}: ResumeBookCreatePreviewProps) {
  const displayTitle = title.trim() || 'Your Resume Book'
  const hasStudents = cappedTotal > 0

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <div
          className={`resume-book-cover resume-book-cover-preview rounded-lg px-10 py-14 text-center shadow-xl transition-transform duration-500 ${
            hasStudents ? 'resume-book-cover-ready' : ''
          } ${generating ? 'resume-book-cover-generating' : ''}`}
        >
          <p className="text-xs uppercase tracking-widest text-primary">Placement Resume Book</p>
          <h2 className="mt-4 line-clamp-2 font-serif text-2xl font-bold text-white">{displayTitle}</h2>
          <p className="mt-3 text-muted-foreground">
            {loading ? 'Checking filters…' : generating ? 'Binding pages…' : `${cappedTotal} students`}
          </p>
          {!loading && !generating && hasStudents ? (
            <p className="mt-5 text-sm text-primary">Ready to generate</p>
          ) : null}
          {!loading && !generating && !hasStudents ? (
            <p className="mt-5 text-sm text-amber-400">Adjust filters to include students</p>
          ) : null}
        </div>

        {generating ? (
          <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/70 backdrop-blur-sm">
            <div className="size-10 animate-spin rounded-full border-2 border-muted border-t-primary" />
          </div>
        ) : null}
      </div>

      <div className="mt-6 w-full max-w-sm rounded-lg border border-border bg-card/60 p-4 text-sm">
        {loading ? (
          <p className="text-muted-foreground">Loading student preview…</p>
        ) : !hasStudents ? (
          <div className="space-y-2 text-muted-foreground">
            <p className="font-medium text-foreground">No students match</p>
            <p>Leave branch and batch as “All” to include every active student, or pick values from the dropdown lists.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-muted-foreground">
              {total > cappedTotal
                ? `${cappedTotal} of ${total} matching students will be included (max limit applied).`
                : `${total} matching student${total === 1 ? '' : 's'} found.`}
            </p>
            {sample.length ? (
              <ul className="space-y-1 border-t border-border pt-3">
                {sample.map((student) => (
                  <li key={student.rollNumber} className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium text-foreground">{student.fullName}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {student.branch || '—'} · {student.batch || '—'}
                    </span>
                  </li>
                ))}
                {total > sample.length ? (
                  <li className="pt-1 text-xs text-muted-foreground">+ {total - sample.length} more…</li>
                ) : null}
              </ul>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}
