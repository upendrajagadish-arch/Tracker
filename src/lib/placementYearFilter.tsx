import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
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
    roll_number?: string | null
  },
  year: PassOutYearFilter,
): boolean {
  if (year === 'all') return true
  return resolveStudentGraduationYear(student) === Number(year)
}

type PassOutYearFilterContextValue = {
  year: PassOutYearFilter
  setYear: (year: PassOutYearFilter) => void
  graduationYear: number | undefined
}

const PassOutYearFilterContext = createContext<PassOutYearFilterContextValue | null>(null)

export function PassOutYearFilterProvider({ children }: { children: ReactNode }) {
  const [year, setYearState] = useState<PassOutYearFilter>(() => readStoredPassOutYearFilter())

  const setYear = useCallback((next: PassOutYearFilter) => {
    setYearState(next)
    writeStoredPassOutYearFilter(next)
  }, [])

  const value = useMemo(
    () => ({
      year,
      setYear,
      graduationYear: year === 'all' ? undefined : Number(year),
    }),
    [year, setYear],
  )

  return (
    <PassOutYearFilterContext.Provider value={value}>{children}</PassOutYearFilterContext.Provider>
  )
}

export function usePassOutYearFilter(_initial?: PassOutYearFilter) {
  const ctx = useContext(PassOutYearFilterContext)
  const [fallbackYear, setFallbackYear] = useState<PassOutYearFilter>(() =>
    _initial ?? readStoredPassOutYearFilter(),
  )

  const setFallback = useCallback((next: PassOutYearFilter) => {
    setFallbackYear(next)
    writeStoredPassOutYearFilter(next)
  }, [])

  if (ctx) return ctx
  return {
    year: fallbackYear,
    setYear: setFallback,
    graduationYear: fallbackYear === 'all' ? undefined : Number(fallbackYear),
  }
}

/** Compact year pills — right-aligned, same style as dashboard WorkspaceTabs. */
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
    <div
      className={cn('ml-auto flex flex-wrap items-center justify-end gap-1.5', className)}
      role="group"
      aria-label="Pass-out year"
    >
      {PASS_OUT_YEAR_FILTERS.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={cn(
            'rounded-md px-2 py-1 text-[11px] font-semibold transition duration-200',
            value === option
              ? 'bg-primary/15 text-binance ring-1 ring-primary/35'
              : 'text-secondary hover:bg-card hover:text-foreground',
          )}
        >
          {option === 'all' ? 'All' : option}
        </button>
      ))}
    </div>
  )
}
