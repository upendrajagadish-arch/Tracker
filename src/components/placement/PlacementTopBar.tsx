import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  Building2,
  CalendarDays,
  LogOut,
  Search,
  UserRound,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { CollegeLogo } from '@/components/CollegeBrand'
import { listStudents } from '@/api/placement/students'
import { listCompanies } from '@/api/placement/companies'
import {
  listPlacementEvents,
} from '@/api/placement/premiumDashboard'
import { signOut } from '@/api/savedProfiles'
import { useAuth } from '@/hooks/useAuth'

interface SearchResult {
  id: string
  label: string
  hint: string
  icon: 'student' | 'company' | 'event'
  href?: string
}

export function PlacementTopBar({ base }: { base: string | null }) {
  const navigate = useNavigate()
  const { user, placementRole, placementProfile } = useAuth()
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const [searchError, setSearchError] = useState<string | null>(null)

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([])
      return
    }
    let cancelled = false
    const timer = window.setTimeout(() => {
      setSearchError(null)
      void Promise.all([
        listStudents({ q: query.trim(), page: 1, limit: 6 }),
        listCompanies().catch(() => []),
        listPlacementEvents().catch(() => []),
      ])
        .then(([students, companies, events]) => {
          if (cancelled) return
          const needle = query.trim().toLowerCase()
          setResults([
          ...students.data.map((student) => ({
            id: student.id,
            label: student.full_name,
            hint: `${student.roll_number} · ${student.branch || 'No branch'}`,
            icon: 'student' as const,
            href: base ? `${base}/students/${student.id}` : undefined,
          })),
          ...companies
            .filter((company) => company.name.toLowerCase().includes(needle))
            .slice(0, 4)
            .map((company) => ({
              id: company.id,
              label: company.name,
              hint: company.industry || 'Company',
              icon: 'company' as const,
              href: base ? `${base}/operations?tab=links` : undefined,
            })),
          ...events
            .filter((event) => event.title.toLowerCase().includes(needle))
            .slice(0, 4)
            .map((event) => ({
              id: event.id,
              label: event.title,
              hint: `${event.event_type.replace(/_/g, ' ')} · ${new Date(event.starts_at).toLocaleDateString()}`,
              icon: 'event' as const,
              href: base ? `${base}/operations?tab=drives` : undefined,
            })),
          ])
        })
        .catch(() => {
          if (!cancelled) {
            setResults([])
            setSearchError('Search is temporarily unavailable.')
          }
        })
    }, 220)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [query, base])

  const handleSignOut = async () => {
    await signOut()
    void navigate({ to: '/login' })
  }

  return (
    <header className="placement-glass sticky top-3 z-40 flex min-h-16 max-w-full items-center gap-2 overflow-visible rounded-2xl px-2 py-2 sm:gap-3 sm:px-4">
      <div className="flex h-11 shrink-0 items-center rounded-xl border border-primary/45 bg-[#0B0E11] px-2 shadow-[0_0_22px_-8px_rgba(210,121,24,0.85)] sm:px-2.5">
        <CollegeLogo height={28} linkToHome={false} bright />
      </div>

      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onFocus={() => setSearchOpen(true)}
          onBlur={() => window.setTimeout(() => setSearchOpen(false), 180)}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search students, companies, drives…"
          aria-label="Search students, companies, and drives"
          className="h-10 w-full rounded-xl border border-border bg-background/70 pl-9 pr-16 text-sm outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/15"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground sm:block">
          Search
        </span>
        {searchOpen && query.trim().length >= 2 ? (
          <div className="placement-glass absolute inset-x-0 top-12 z-50 max-h-[420px] overflow-y-auto rounded-xl p-2">
            {searchError ? (
              <p className="px-3 py-6 text-center text-sm text-destructive">{searchError}</p>
            ) : results.length ? (
              results.map((result) => {
                const Icon =
                  result.icon === 'student'
                    ? UserRound
                    : result.icon === 'company'
                      ? Building2
                      : CalendarDays
                return (
                  <button
                    key={`${result.icon}-${result.id}`}
                    type="button"
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-accent"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      if (result.href) void navigate({ to: result.href as never })
                      setSearchOpen(false)
                      setQuery('')
                    }}
                  >
                    <span className="rounded-lg bg-primary/10 p-2 text-primary">
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{result.label}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {result.hint}
                      </span>
                    </span>
                  </button>
                )
              })
            ) : (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                No matching records
              </p>
            )}
          </div>
        ) : null}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-10 rounded-xl px-2 sm:px-3">
            <span className="flex size-7 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
              {(placementProfile?.full_name || user?.email || 'U').slice(0, 1).toUpperCase()}
            </span>
            <span className="hidden max-w-28 truncate text-sm font-semibold md:block">
              {placementProfile?.full_name || user?.email}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <span className="block truncate">{placementProfile?.full_name || 'Staff user'}</span>
            <span className="block truncate text-xs font-normal text-muted-foreground">
              {user?.email} · {placementRole}
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => void handleSignOut()}>
            <LogOut className="size-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}

