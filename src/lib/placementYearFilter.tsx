import { useCallback, useEffect, useState } from 'react'
import { TRAINING_YEARS, resolveStudentGraduationYear, type TrainingYear } from '@/lib/trainingPrograms'
import { cn } from '@/lib/utils'

export type PassOutYearFilter = 'all' | `${TrainingYear}`

const STORAGE_KEY = 'codetrace.passOutYearFilter'
export const PASS_OUT_YEAR_FILTERS: PassOutYearFilter[] = [
  'all',
  ...TRAINING_YEARS.map((year) => String(year) as PassOutYearFilter),
]

function isPassOutYearFilter(value: string): value is PassOutYearFilter {
  return (PASS_OUT_YEAR_FILTERS as string[]).includes(value)
}

export function readStoredPassOutYearFilter(): PassOutYearFilter {
  if (typeof window === 'undefined') return 'all'
  try {
    const stored = window.sessionStorage.getItem(STORAGE_KEY)
    if (stored && isPassOutYearFilter(stored)) return stored
  } catch {
    /* ignore */
  }
  return 'all'
}

export function writeStoredPassOutYearFilter(value: PassOutYearFilter) {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(STORAGE_KEY, value)
  } catch {
    /* ignore */
  }
}

/** Match student pass-out year against the shared dashboard filter. */
export function studentMatchesPassOutYear(
  student: {
    graduation_year?: number | null
    academic_batch?: string | null
    batch?: string | null
  },
  year: PassOutYearFilter,
): boolean {
  if (year === 'all') return true
  return resolveStudentGraduationYear(student) === Number(year)
}

export function usePassOutYearFilter(initial?: PassOutYearFilter) {
  const [year, setYearState] = useState<PassOutYearFilter>(() => initial ?? readStoredPassOutYearFilter())

  useEffect(() => {
    if (initial) setYearState(initial)
  }, [initial])

  const setYear = useCallback((next: PassOutYearFilter) => {
    setYearState(next)
    writeStoredPassOutYearFilter(next)
  }, [])

  return { year, setYear, graduationYear: year === 'all' ? undefined : Number(year) }
}

export function PassOutYearFilterBar({
  value,
  onChange,
  className,
}: {
  value: PassOutYearFilter
  onChange: (value: PassOutYearFilter) => void
  className?: string
}) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2 rounded-card border border-soft bg-elevated p-2', className)}>
      <span className="px-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        Pass-out year
      </span>
      {PASS_OUT_YEAR_FILTERS.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={cn(
            'rounded-md px-3 py-2 text-sm font-semibold transition',
            value === option ? 'bg-card text-binance' : 'text-secondary hover:text-foreground',
          )}
        >
          {option === 'all' ? 'All years' : option}
        </button>
      ))}
    </div>
  )
}
