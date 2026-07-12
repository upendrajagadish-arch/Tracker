import { useMemo, useState, type ReactNode } from 'react'
import { ArrowLeft, ArrowRight, Link2, LogIn, UserCircle2 } from 'lucide-react'
import { SeoHead } from '@/components/SeoHead'
import { useQueryStates, parseAsString } from 'nuqs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AppFooter } from '../components/AppFooter'
import { Link, useNavigate } from '@tanstack/react-router'
import type { Platform, Usernames } from '../types/api'
import { shareOrCopyUrl, splitAccounts } from '../lib/utils'
import { getMyPublicProfile, savePrimaryProfileConfig } from '../api/savedProfiles'
import { usernamesToConfig } from '../lib/profileConfig'
import { useAuth } from '../hooks/useAuth'
import { SearchBar } from '../components/SearchBar'
import { PlatformCard } from '../components/PlatformCard'
import { GitHubCard } from '../components/GitHubCard'
import { LeetCodeCard } from '../components/LeetCodeCard'
import { CodeforcesCard } from '../components/CodeforcesCard'
import { GFGCard } from '../components/GFGCard'
import { CodeChefCard } from '../components/CodeChefCard'
import { HackerRankCard } from '../components/HackerRankCard'
import { TUFCard } from '../components/TUFCard'
import { SummaryStrip } from '../components/SummaryStrip'
import { PlatformLegend } from '../components/PlatformLegend'
import { ShareFab } from '../components/ShareFab'
import { WorkspaceTabs } from '@/components/placement/WorkspaceTabs'
import { BRAND_NAME, BRAND_SLUG } from '@/lib/brand'

const CARD_RENDERERS: Record<Platform, (username: string) => ReactNode> = {
  github:     (u) => <GitHubCard username={u} />,
  leetcode:   (u) => <LeetCodeCard username={u} />,
  codeforces: (u) => <CodeforcesCard username={u} />,
  gfg:        (u) => <GFGCard username={u} />,
  codechef:   (u) => <CodeChefCard username={u} />,
  hackerrank: (u) => <HackerRankCard username={u} />,
  tuf:        (u) => <TUFCard username={u} />,
}

export function HomePage() {
  const navigate = useNavigate()
  const { user, isConfigured } = useAuth()
  const [query, setQuery] = useQueryStates({
    github: parseAsString.withDefault(''),
    leetcode: parseAsString.withDefault(''),
    codeforces: parseAsString.withDefault(''),
    gfg: parseAsString.withDefault(''),
    codechef: parseAsString.withDefault(''),
    hackerrank: parseAsString.withDefault(''),
    tuf: parseAsString.withDefault(''),
  }, { history: 'replace' })

  const hasAnyQuery = !!(query.github || query.leetcode || query.codeforces || query.gfg || query.codechef || query.hackerrank || query.tuf)

  const [isSubmitted, setIsSubmitted] = useState(() => {
    return hasAnyQuery
  })
  const [saveState, setSaveState] = useState<{ loading: boolean; message: string | null; error: string | null }>({
    loading: false,
    message: null,
    error: null,
  })

  const usernames: Usernames | null =
    isSubmitted && hasAnyQuery
      ? {
          github: query.github,
          leetcode: query.leetcode,
          codeforces: query.codeforces,
          gfg: query.gfg,
          codechef: query.codechef,
          hackerrank: query.hackerrank,
          tuf: query.tuf,
        }
      : null

  const handleSearchAgain = () => {
    setIsSubmitted(false)
    setQuery(null)
  }

  // Share the current view as-is — the long URL with every ?platform=handle
  // param embedded in it.
  const [shareToast, setShareToast] = useState<{ text: string; tone: 'success' | 'error' } | null>(null)
  const handleShareParams = async () => {
    const result = await shareOrCopyUrl(window.location.href, BRAND_NAME)
    if (result === 'copied') setShareToast({ text: 'Link with params copied', tone: 'success' })
    if (result === 'failed') setShareToast({ text: 'Copy failed', tone: 'error' })
  }

  const handleSaveProfile = async () => {
    setSaveState({ loading: true, message: null, error: null })
    try {
      if (!isConfigured) {
        throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
      }
      if (!user) {
        navigate({
          to: '/login',
          search: { next: `${window.location.pathname}${window.location.search}` },
        })
        setSaveState({ loading: false, message: null, error: null })
        return
      }

      const profile = await getMyPublicProfile()
      if (!profile) {
        // Claim a userid first — come back to these exact handles after.
        navigate({
          to: '/account',
          search: { next: `${window.location.pathname}${window.location.search}` },
        })
        return
      }

      await savePrimaryProfileConfig(usernamesToConfig(query))
      const url = `${window.location.origin}/${profile.username}`
      await navigator.clipboard?.writeText(url).catch(() => undefined)
      setSaveState({ loading: false, message: `Saved and copied ${url}`, error: null })
    } catch (error) {
      setSaveState({ loading: false, message: null, error: error instanceof Error ? error.message : String(error) })
    }
  }

  // Short confirmation shown on the FAB; the detailed line below the toolbar
  // carries any longer message (e.g. the Supabase config hint).
  const fabToast = useMemo<{ text: string; tone: 'success' | 'error' } | null>(() => {
    if (saveState.error) return { text: 'Couldn’t save — see note', tone: 'error' }
    if (saveState.message) return { text: 'Saved · link copied', tone: 'success' }
    return null
  }, [saveState.error, saveState.message])

  return (
    <>
      <SeoHead
        title={BRAND_NAME}
        description="Track your coding footprint across GitHub, LeetCode, Codeforces, GFG, CodeChef, HackerRank &amp; takeUforward."
        url="https://codetrace.xyz/app"
      />
      <div className="px-4 py-12 md:px-8">
      <div className="mx-auto max-w-5xl">
        <WorkspaceTabs active="coding" />

        {/* Header — a boot-sequence terminal on the landing view, a compact
            window titlebar once results load */}
        {!usernames ? (
          <header className="rise-in relative mb-12">
            {/* Quiet auth nav above the boot terminal */}
            <nav className="mx-auto mb-4 flex max-w-2xl items-center justify-end gap-4 font-mono text-[11px]">
              {user ? (
                <Link to="/account" className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-primary">
                  <UserCircle2 className="size-3" />account
                </Link>
              ) : (
                <Link to="/login" className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-primary">
                  <LogIn className="size-3" />
                  <span className="text-[var(--term-green)]">$</span> login
                </Link>
              )}
            </nav>
            <div className="term-window scanlines mx-auto max-w-2xl">
              <div className="term-bar">
                <span className="term-dot" style={{ background: 'var(--term-red)' }} />
                <span className="term-dot" style={{ background: 'var(--term-amber)' }} />
                <span className="term-dot" style={{ background: 'var(--term-green)' }} />
                <span className="ml-2 truncate font-mono text-[11px] text-muted-foreground/80">
                  ~/{BRAND_SLUG} — zsh — 80×24
                </span>
                <span className="ml-auto inline-flex shrink-0 items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--term-green)]">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--term-green)] opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--term-green)]" />
                  </span>
                  online
                </span>
              </div>

              <div className="scan-sweep crt-grid px-6 py-9 md:px-10 md:py-11">
                {/* glitching pixel wordmark */}
                <h1
                  className="glitch glow-text font-pixel text-[2.75rem] leading-none text-foreground md:text-6xl"
                  data-text={BRAND_NAME}
                >
                  {BRAND_NAME}
                </h1>

                <p className="caret mt-5 max-w-lg font-mono text-sm leading-relaxed text-muted-foreground">
                  Track your coding footprint across GitHub, LeetCode, Codeforces, GFG, CodeChef, HackerRank &amp; takeUforward — DSA sheet progress with topic-level breakdown, submission heatmaps, and streak tracking
                </p>
              </div>
            </div>
          </header>
        ) : (
          <header className="rise-in relative mb-10">
            <div className="term-window">
              <div className="term-bar flex-wrap gap-y-2">
                <span className="term-dot" style={{ background: 'var(--term-red)' }} />
                <span className="term-dot" style={{ background: 'var(--term-amber)' }} />
                <span className="term-dot" style={{ background: 'var(--term-green)' }} />
                <Link
                  to="/"
                  className="glow-text ml-2 font-pixel text-base text-foreground transition-opacity hover:opacity-80"
                >
                  {BRAND_NAME}
                </Link>
                <div className="ml-auto flex items-center gap-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSearchAgain}
                    className="font-mono text-xs text-muted-foreground hover:text-primary"
                  >
                    <ArrowLeft data-icon="inline-start" />
                    [esc] search
                  </Button>
                  {/* Primary CTA — the unified profile is the point of the app */}
                  <Button
                    asChild
                    className="group h-8 gap-2 rounded-md px-4 font-mono text-xs shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/40"
                  >
                    <Link to="/profile" search={(prev) => prev}>
                      ./student_profile
                      <ArrowRight data-icon="inline-end" className="transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </header>
        )}

        {!usernames ? (
          <div className="fade-in">
            <SearchBar onSubmit={() => setIsSubmitted(true)} />
            <PlatformLegend />
            <AppFooter />
          </div>
        ) : (
          <div className="fade-in flex flex-col gap-8">
            {/* Active handles being tracked */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-[11px]">
              <span className="text-[var(--term-green)]">$ tracking --live</span>
              <div className="flex flex-wrap gap-2">
                {(Object.entries(usernames) as [keyof Usernames, string][])
                  .flatMap(([k, v]) => splitAccounts(v).map((u) => [k, u] as const))
                  .map(([k, u]) => (
                    <Badge key={`${k}-${u}`} variant="outline" className="rounded-md font-mono text-[10px]">
                      <span className="text-muted-foreground/50">{k}/</span>{u}
                    </Badge>
                  ))}
              </div>
            </div>
            {(saveState.message || saveState.error) && (
              <p className={`font-mono text-xs ${saveState.error ? 'text-destructive' : 'text-primary'}`}>
                {saveState.error ?? saveState.message}
              </p>
            )}

            <SummaryStrip usernames={usernames} />

            {/* One card per stacked account, in canonical platform order */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {(Object.entries(usernames) as [Platform, string][])
                .flatMap(([platform, value]) =>
                  splitAccounts(value).map((username) => ({ platform, username })),
                )
                .map(({ platform, username }, i) => (
                  <PlatformCard
                    key={`${platform}-${username}`}
                    platform={platform}
                    username={username}
                    animIndex={i}
                    detailLink={`/${platform}/${username}`}
                  >
                    {CARD_RENDERERS[platform](username)}
                  </PlatformCard>
                ))}
            </div>

            {/* Common terminal footer */}
            <AppFooter />

            {/* Floating share — long URL with params, or the short userid URL */}
            <ShareFab
              label="Share"
              busy={saveState.loading}
              toast={fabToast ?? shareToast}
              onToastDone={() => setShareToast(null)}
              actions={[
                {
                  key: 'params',
                  label: 'share url with these params',
                  icon: Link2,
                  onClick: () => void handleShareParams(),
                },
                user
                  ? {
                      key: 'short',
                      label: 'save & copy short url',
                      icon: UserCircle2,
                      onClick: () => void handleSaveProfile(),
                    }
                  : {
                      key: 'login',
                      label: 'login for short url',
                      icon: LogIn,
                      onClick: () => navigate({
                        to: '/login',
                        search: { next: `${window.location.pathname}${window.location.search}` },
                      }),
                    },
              ]}
            />
          </div>
        )}
      </div>
    </div>
    </>
  )
}
