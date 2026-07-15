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
import { BRAND_NAME } from '@/lib/brand'

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
      <div className="flex flex-1 flex-col px-4 py-8 sm:px-6 md:px-8">
      <div className="app-stack mx-auto w-full max-w-5xl">
        <WorkspaceTabs active="coding" />

        {/* Header — a boot-sequence terminal on the landing view, a compact
            window titlebar once results load */}
        {!usernames ? (
          <header className="rise-in relative mb-12">
            <nav className="mx-auto mb-4 flex max-w-2xl items-center justify-end gap-4 text-[14px] font-semibold">
              {user ? (
                <Link to="/account" className="inline-flex items-center gap-1.5 text-binance transition-opacity hover:opacity-80">
                  <UserCircle2 className="size-4" strokeWidth={2} /> Account
                </Link>
              ) : (
                <Link to="/login" className="inline-flex items-center gap-1.5 text-binance transition-opacity hover:opacity-80">
                  <LogIn className="size-4" strokeWidth={2} /> Login
                </Link>
              )}
            </nav>
            <div className="mx-auto max-w-2xl overflow-hidden rounded-card border border-soft bg-card">
              <div className="px-6 py-10 md:px-8 md:py-12">
                <p className="text-[12px] font-semibold text-muted">Coding analytics</p>
                <h1 className="mt-2 font-heading text-[40px] font-bold leading-none tracking-tight text-foreground md:text-[48px]">
                  {BRAND_NAME}
                </h1>
                <p className="mt-4 max-w-lg text-[14px] leading-relaxed text-secondary">
                  Track your coding footprint across GitHub, LeetCode, Codeforces, GFG, CodeChef, HackerRank &amp; takeUforward — DSA sheet progress with topic-level breakdown, submission heatmaps, and streak tracking
                </p>
              </div>
            </div>
          </header>
        ) : (
          <header className="rise-in relative mb-8">
            <div className="flex flex-wrap items-center gap-y-2 border-b border-soft pb-3">
              <Link
                to="/"
                className="font-heading text-[18px] font-bold tracking-tight text-foreground transition-colors hover:text-binance"
              >
                {BRAND_NAME}
              </Link>
              <div className="ml-auto flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSearchAgain}
                >
                  <ArrowLeft data-icon="inline-start" strokeWidth={2} />
                  Search again
                </Button>
                <Button asChild className="group gap-2">
                  <Link to="/profile" search={(prev) => prev}>
                    Student profile
                    <ArrowRight data-icon="inline-end" className="transition-transform group-hover:translate-x-0.5" strokeWidth={2} />
                  </Link>
                </Button>
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
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[14px]">
              <span className="text-secondary">Tracking</span>
              <div className="flex flex-wrap gap-2">
                {(Object.entries(usernames) as [keyof Usernames, string][])
                  .flatMap(([k, v]) => splitAccounts(v).map((u) => [k, u] as const))
                  .map(([k, u]) => (
                    <Badge key={`${k}-${u}`} variant="outline">
                      <span className="text-muted">{k}/</span>{u}
                    </Badge>
                  ))}
              </div>
            </div>
            {(saveState.message || saveState.error) && (
              <p className={`text-[14px] font-semibold ${saveState.error ? 'text-[#F6465D]' : 'text-binance'}`}>
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
