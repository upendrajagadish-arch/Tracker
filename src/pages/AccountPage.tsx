import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate, useRouter, useSearch } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { SeoHead } from '@/components/SeoHead'
import { ArrowRight, Check, Copy, ExternalLink, Loader2, LogOut, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { AppHeader } from '@/components/AppHeader'
import { AppFooter } from '@/components/AppFooter'
import { PlatformHandleInputs } from '@/components/PlatformHandleInputs'
import { Link } from '@tanstack/react-router'
import { useAuth } from '@/hooks/useAuth'
import { placementHomeForRole } from '@/lib/placementAuth'
import { isStaffPlacementRole } from '@/lib/placementStaff'
import { asPlacementPath } from '@/components/placement/PlacementLink'
import { getPlacementNavLinks } from '@/lib/placementNavigation'
import {
  getMyPrimaryProfileConfig,
  getMyPublicProfile,
  savePrimaryProfileConfig,
  saveProfileUsername,
  signOut,
} from '@/api/savedProfiles'
import {
  EMPTY_USERNAMES,
  configToUsernames,
  hasConfigAccounts,
  normalizeProfileUsername,
  usernamesToConfig,
  validateProfileUsername,
} from '@/lib/profileConfig'
import type { Usernames } from '@/types/api'
import { BRAND_NAME } from '@/lib/brand'

/** The account page: claim/change your userid and configure the platform ids
 *  behind it — that pair is what makes /<userid> a working short URL. */
export function AccountPage() {
  const navigate = useNavigate()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { user, isLoading, placementRole } = useAuth()
  const placementHome = placementRole && isStaffPlacementRole(placementRole)
    ? placementHomeForRole(placementRole)
    : null
  const placementLinks = isStaffPlacementRole(placementRole) ? getPlacementNavLinks(placementRole) : []
  // Mounted at both /account and /onboarding, so read search loosely.
  const { next } = useSearch({ strict: false }) as { next?: string }

  // ── Load current identity + config once per sign-in ─────────
  const [loaded, setLoaded] = useState(false)
  const [username, setUsername] = useState('')
  const [existingUsername, setExistingUsername] = useState<string | null>(null)
  const [handles, setHandles] = useState<Usernames>({ ...EMPTY_USERNAMES })
  const [hasSavedConfig, setHasSavedConfig] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (isLoading) return
    if (!user) {
      const returnTo = next ? `/account?next=${encodeURIComponent(next)}` : '/account'
      navigate({ to: '/login', search: { next: returnTo } })
      return
    }
    let cancelled = false
    Promise.all([getMyPublicProfile(), getMyPrimaryProfileConfig()])
      .then(([profile, config]) => {
        if (cancelled) return
        if (profile) {
          setExistingUsername(profile.username)
          setUsername(profile.username)
        }
        if (config) {
          setHandles(configToUsernames(config))
          setHasSavedConfig(hasConfigAccounts(config))
        }
        setLoaded(true)
      })
      .catch((err) => {
        if (cancelled) return
        setLoadError(err instanceof Error ? err.message : String(err))
        setLoaded(true)
      })
    return () => { cancelled = true }
  }, [isLoading, user, next, navigate])

  // ── Username form ────────────────────────────────────────────
  const [usernameError, setUsernameError] = useState<string | null>(null)
  const [usernameSaved, setUsernameSaved] = useState(false)
  const [isSavingUsername, setIsSavingUsername] = useState(false)
  const normalized = normalizeProfileUsername(username)
  const usernameValidation = validateProfileUsername(username)
  const usernameChanged = normalized !== (existingUsername ?? '')

  const handleSaveUsername = async (event: FormEvent) => {
    event.preventDefault()
    setUsernameError(null)
    setUsernameSaved(false)
    if (usernameValidation) {
      setUsernameError(usernameValidation)
      return
    }
    setIsSavingUsername(true)
    try {
      await saveProfileUsername(username)
      setExistingUsername(normalized)
      setUsernameSaved(true)
      queryClient.invalidateQueries({ queryKey: ['public-profile'] })
      // Came here mid-flow (e.g. from the dashboard save button)? Head back.
      if (next) router.history.push(next)
    } catch (err) {
      setUsernameError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsSavingUsername(false)
    }
  }

  // ── Platform ids form ────────────────────────────────────────
  const [configError, setConfigError] = useState<string | null>(null)
  const [configSavedUrl, setConfigSavedUrl] = useState<string | null>(null)
  const [isSavingConfig, setIsSavingConfig] = useState(false)
  const config = useMemo(() => usernamesToConfig(handles), [handles])

  const handleSaveConfig = async (event: FormEvent) => {
    event.preventDefault()
    setConfigError(null)
    setConfigSavedUrl(null)
    setIsSavingConfig(true)
    try {
      await savePrimaryProfileConfig(config)
      setHasSavedConfig(true)
      queryClient.invalidateQueries({ queryKey: ['public-profile'] })
      if (existingUsername) {
        const url = `${window.location.origin}/${existingUsername}`
        await navigator.clipboard?.writeText(url).catch(() => undefined)
        setConfigSavedUrl(url)
      } else {
        setConfigSavedUrl('saved — claim a userid above to get your URL')
      }
    } catch (err) {
      setConfigError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsSavingConfig(false)
    }
  }

  // ── Public URL helpers ───────────────────────────────────────
  const [copiedUrl, setCopiedUrl] = useState(false)
  const publicUrl = existingUsername ? `${window.location.origin}/${existingUsername}` : null
  const handleCopyUrl = async () => {
    if (!publicUrl) return
    try {
      await navigator.clipboard.writeText(publicUrl)
      setCopiedUrl(true)
      setTimeout(() => setCopiedUrl(false), 2000)
    } catch { /* clipboard blocked */ }
  }

  if (isLoading || !user || !loaded) {
    return (
      <>
        <SeoHead title="Account" />
        <div className="px-4 py-8 sm:px-6 md:px-8">
          <div className="mx-auto max-w-3xl">
            <Skeleton className="h-72 w-full rounded-card" />
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <SeoHead title="Account" description="Manage your userid and platform accounts." url="https://codetrace.xyz/account" />
      <div className="px-4 py-8 sm:px-6 md:px-8">
      <div className="app-stack mx-auto max-w-3xl">
        <AppHeader backTo="/app" backLabel="dashboard" shareUrl={publicUrl ?? undefined} shareTitle={`${BRAND_NAME} profile`} className="mb-0" />

        {loadError && <p className="mb-6 font-mono text-xs text-destructive">{loadError}</p>}

        {placementHome && placementLinks.length > 0 ? (
          <section className="term-window scanlines mb-8 rise-in">
            <div className="term-bar">
              <span className="term-dot" style={{ background: 'var(--term-red)' }} />
              <span className="term-dot" style={{ background: 'var(--term-amber)' }} />
              <span className="term-dot" style={{ background: 'var(--term-green)' }} />
              <span className="ml-2 font-mono text-[11px] text-muted-foreground/80">~/placement — office</span>
            </div>
            <div className="crt-grid px-6 py-6 md:px-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="glow-text font-pixel text-2xl text-foreground">Placement Office</h2>
                  <p className="mt-2 font-mono text-xs leading-relaxed text-muted-foreground">
                    Signed in as <span className="capitalize text-primary">{placementRole}</span>. Open the placement dashboard for students, tech stack, and communication.
                  </p>
                </div>
                <Button asChild className="font-mono text-xs">
                  <Link to={asPlacementPath(placementHome)}>
                    Open Placement Office
                    <ArrowRight data-icon="inline-end" />
                  </Link>
                </Button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {placementLinks.map((link) => (
                  <Button key={link.to} asChild variant="outline" size="sm" className="font-mono text-[10px]">
                    <Link to={asPlacementPath(link.to)}>{link.label}</Link>
                  </Button>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {/* ── Userid ─────────────────────────────────────────── */}
        <section className="term-window scanlines rise-in">
          <div className="term-bar">
            <span className="term-dot" style={{ background: 'var(--term-red)' }} />
            <span className="term-dot" style={{ background: 'var(--term-amber)' }} />
            <span className="term-dot" style={{ background: 'var(--term-green)' }} />
            <span className="ml-2 font-mono text-[11px] text-muted-foreground/80">~/account — userid</span>
          </div>
          <form onSubmit={handleSaveUsername} className="crt-grid px-6 py-8 md:px-9">
            <h1 className="glow-text font-pixel text-3xl text-foreground">Your userid</h1>
            <p className="mt-2 font-mono text-xs leading-relaxed text-muted-foreground">
              The short URL for your whole profile. Configure the platform ids it
              points at below.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-2">
                <label className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  userid
                </label>
                <Input
                  value={username}
                  onChange={(event) => { setUsername(event.target.value); setUsernameSaved(false) }}
                  placeholder="Enter username"
                  className="font-mono"
                />
              </div>
              <Button
                type="submit"
                disabled={isSavingUsername || Boolean(usernameValidation) || !usernameChanged}
                className="font-mono text-xs"
              >
                {isSavingUsername
                  ? <Loader2 data-icon="inline-start" className="animate-spin" />
                  : usernameSaved ? <Check data-icon="inline-start" /> : <ArrowRight data-icon="inline-start" />}
                {existingUsername ? (usernameSaved ? 'saved' : 'update userid') : 'claim userid'}
              </Button>
            </div>

            {publicUrl && (
              <div className="mt-4 flex flex-wrap items-center gap-2 font-mono text-xs">
                <span className="text-[var(--term-green)]">→</span>
                <span className="text-muted-foreground">{window.location.origin}/</span>
                <span className="-ml-2 text-primary">{existingUsername}</span>
                <Button type="button" variant="ghost" size="icon" className="size-7" title="Copy URL" onClick={handleCopyUrl}>
                  {copiedUrl ? <Check className="size-3.5 text-primary" /> : <Copy className="size-3.5" />}
                </Button>
                <Button type="button" variant="ghost" size="icon" className="size-7" title="Open" asChild>
                  <a href={publicUrl} target="_blank" rel="noreferrer"><ExternalLink className="size-3.5" /></a>
                </Button>
                {!hasSavedConfig && (
                  <span className="text-[var(--term-amber)]">warn: 0 accounts mounted — save your ids below</span>
                )}
              </div>
            )}
            {usernameValidation && username && (
              <p className="mt-3 font-mono text-xs text-muted-foreground">{usernameValidation}</p>
            )}
            {usernameError && <p className="mt-3 font-mono text-xs text-destructive">{usernameError}</p>}
          </form>
        </section>

        {/* ── Platform ids ───────────────────────────────────── */}
        <section className="term-window scanlines rise-in mt-8" style={{ animationDelay: '80ms' }}>
          <div className="term-bar">
            <span className="term-dot" style={{ background: 'var(--term-red)' }} />
            <span className="term-dot" style={{ background: 'var(--term-amber)' }} />
            <span className="term-dot" style={{ background: 'var(--term-green)' }} />
            <span className="ml-2 font-mono text-[11px] text-muted-foreground/80">~/account — platform_ids</span>
          </div>
          <form onSubmit={handleSaveConfig} className="crt-grid px-6 py-8 md:px-9">
            <h2 className="font-heading text-lg font-semibold tracking-tight text-foreground">
              <span className="text-muted-foreground/40">## </span>platform_ids
            </h2>
            <p className="mt-2 font-mono text-xs leading-relaxed text-muted-foreground">
              These accounts are what {publicUrl ? <span className="text-primary">/{existingUsername}</span> : 'your userid URL'} compiles.
              Any mix of platforms, several accounts each.
            </p>

            <div className="mt-6">
              <PlatformHandleInputs value={handles} onChange={setHandles} />
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button
                type="submit"
                disabled={isSavingConfig || !hasConfigAccounts(config)}
                className="gap-2 font-mono text-xs"
              >
                {isSavingConfig ? <Loader2 data-icon="inline-start" className="animate-spin" /> : <Save data-icon="inline-start" />}
                save platform ids
              </Button>
              {configSavedUrl && (
                <p className="font-mono text-xs text-primary">
                  {configSavedUrl.startsWith('http') ? <>published &amp; copied: <a href={configSavedUrl} className="underline underline-offset-4">{configSavedUrl}</a></> : configSavedUrl}
                </p>
              )}
              {configError && <p className="font-mono text-xs text-destructive">{configError}</p>}
            </div>
          </form>
        </section>

        {/* ── Sign out ───────────────────────────────────────── */}
        <div className="mt-8 flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void signOut().then(() => navigate({ to: '/app' }))}
            className="font-mono text-xs text-muted-foreground hover:text-destructive"
          >
            <LogOut data-icon="inline-start" />sign out
          </Button>
        </div>

        <AppFooter />
      </div>
    </div>
    </>
  )
}
