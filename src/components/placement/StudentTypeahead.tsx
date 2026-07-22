import { useEffect, useId, useRef, useState } from 'react'
import { Search, UserRound, X } from 'lucide-react'
import { listStudents, type StudentProfileRow } from '@/api/placement/students'
import { studentMatchesPassOutYear, type PassOutYearFilter } from '@/lib/placementYearFilter'
import { cn } from '@/lib/utils'

export type StudentTypeaheadOption = Pick<
  StudentProfileRow,
  'id' | 'full_name' | 'roll_number' | 'branch' | 'batch' | 'academic_batch' | 'graduation_year' | 'section'
>

function studentLabel(student: StudentTypeaheadOption) {
  return `${student.full_name} · ${student.roll_number}`
}

export function StudentTypeahead({
  selectedId,
  selectedLabel,
  onSelect,
  onClear,
  yearFilter = 'all',
  placeholder = 'Type student name or roll number…',
  disabled,
  className,
}: {
  selectedId?: string
  selectedLabel?: string
  onSelect: (student: StudentTypeaheadOption) => void
  onClear?: () => void
  yearFilter?: PassOutYearFilter
  placeholder?: string
  disabled?: boolean
  className?: string
}) {
  const listId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<StudentTypeaheadOption[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (selectedId && selectedLabel) {
      setQuery(selectedLabel)
    }
  }, [selectedId, selectedLabel])

  useEffect(() => {
    const needle = query.trim()
    if (selectedId && selectedLabel && needle === selectedLabel.trim()) {
      setResults([])
      return
    }
    if (needle.length < 1) {
      setResults([])
      setError(null)
      return
    }

    let cancelled = false
    const timer = window.setTimeout(() => {
      setLoading(true)
      setError(null)
      void listStudents({
        q: needle,
        page: 1,
        limit: 12,
        orderBy: 'full_name',
        orderAscending: true,
        graduationYear: yearFilter === 'all' ? undefined : Number(yearFilter),
      })
        .then((page) => {
          if (cancelled) return
          const rows = page.data.filter((student) => studentMatchesPassOutYear(student, yearFilter))
          setResults(rows)
        })
        .catch((e) => {
          if (cancelled) return
          setResults([])
          setError(e instanceof Error ? e.message : 'Student search failed')
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }, 180)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [query, selectedId, selectedLabel, yearFilter])

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    window.addEventListener('mousedown', onPointerDown)
    return () => window.removeEventListener('mousedown', onPointerDown)
  }, [])

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={query}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          className="flex h-10 w-full rounded-md border border-border bg-card pl-9 pr-9 text-sm text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-primary/40"
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value)
            setOpen(true)
            if (selectedId && event.target.value.trim() !== (selectedLabel || '').trim()) {
              onClear?.()
            }
          }}
        />
        {query ? (
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
            aria-label="Clear student search"
            onClick={() => {
              setQuery('')
              setResults([])
              onClear?.()
              setOpen(false)
            }}
          >
            <X className="size-3.5" />
          </button>
        ) : null}
      </div>

      {selectedId && selectedLabel && query.trim() === selectedLabel.trim() ? (
        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-primary">
          <UserRound className="size-3.5" />
          Selected: {selectedLabel}
        </p>
      ) : null}

      {error ? <p className="mt-1.5 text-xs text-destructive">{error}</p> : null}

      {open && query.trim().length >= 1 ? (
        <div
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-soft bg-[#111418] p-1 shadow-[0_18px_40px_-20px_rgba(0,0,0,0.85)]"
        >
          {loading ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">Searching…</p>
          ) : results.length ? (
            results.map((student) => (
              <button
                key={student.id}
                type="button"
                role="option"
                className="flex w-full flex-col gap-0.5 rounded-lg px-3 py-2 text-left transition hover:bg-primary/10"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onSelect(student)
                  setQuery(studentLabel(student))
                  setOpen(false)
                  setResults([])
                }}
              >
                <span className="text-sm font-semibold text-foreground">{student.full_name}</span>
                <span className="font-mono text-[11px] text-primary">{student.roll_number}</span>
                <span className="text-[11px] text-muted-foreground">
                  {[student.branch, student.graduation_year || student.academic_batch || student.batch]
                    .filter(Boolean)
                    .join(' · ') || 'Profile'}
                </span>
              </button>
            ))
          ) : (
            <p className="px-3 py-2 text-xs text-muted-foreground">No matching students.</p>
          )}
        </div>
      ) : null}
    </div>
  )
}
