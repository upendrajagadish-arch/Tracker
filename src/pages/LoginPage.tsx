import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useRouter, useSearch } from '@tanstack/react-router'
import { SeoHead } from '@/components/SeoHead'
import { ArrowLeft, LogIn, Link2, UserCircle2, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AppFooter } from '@/components/AppFooter'
import { PlatformIcon } from '@/components/PlatformIcon'
import { useAuth } from '@/hooks/useAuth'
import { signInWithPassword, signOut } from '@/api/savedProfiles'
import { fetchPlacementProfile, placementHomeForRole } from '@/lib/placementAuth'
import { isStaffPlacementRole } from '@/lib/placementStaff'
import { isAllowedStaffLogin } from '@/lib/placementStaffLogins'
import { requireSupabase } from '@/lib/supabase'
import { ALL_PLATFORMS } from '@/api/unifiedClient'
import { BRAND_SLUG } from '@/lib/brand'

const PLATFORM_NAMES: Record<string, string> = {
  github: 'GitHub',
  leetcode: 'LeetCode',
  codeforces: 'Codeforces',
  gfg: 'GeeksForGeeks',
  codechef: 'CodeChef',
  hackerrank: 'HackerRank',
  tuf: 'takeUforward',
}

const PERKS = [
  { icon: UserCircle2, title: 'student dossiers', text: 'View profiles, resumes, coding traces, and readiness in one place.' },
  { icon: Link2, title: 'platform handles', text: 'Track LeetCode, Codeforces, GitHub, and more per student from TPO records.' },
  { icon: Share2, title: 'resume books', text: 'Generate shareable resume books with PDF download for recruiters.' },
]

export function LoginPage() {
  const navigate = useNavigate()
  const router = useRouter()
  const { user, isConfigured, isLoading, placementLoading, placementRole, refreshPlacementProfile } = useAuth()
  const { next } = useSearch({ from: '/login' })
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSigningIn, setIsSigningIn] = useState(false)

  useEffect(() => {
    if (isLoading || placementLoading || !user) return
    if (placementRole === 'student') return
    if (next) {
      router.history.push(next)
      return
    }
    if (placementRole && isStaffPlacementRole(placementRole)) {
      router.history.push(placementHomeForRole(placementRole))
      return
    }
    navigate({ to: '/account' })
  }, [isLoading, placementLoading, user, placementRole, next, navigate, router])

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    const normalizedEmail = email.trim().toLowerCase()
    if (!isAllowedStaffLogin(normalizedEmail)) {
      setError('This account is not authorized for placement office access.')
      return
    }
    setIsSigningIn(true)
    try {
      await signInWithPassword(normalizedEmail, password)
      await refreshPlacementProfile()
      const client = requireSupabase()
      const { data: auth } = await client.auth.getUser()
      if (auth.user) {
        const profile = await fetchPlacementProfile(auth.user.id)
        if (profile?.role === 'student') {
          await signOut()
          setError('This portal is for placement staff only. Students do not sign in here.')
          return
        }
        if (profile?.role && isStaffPlacementRole(profile.role)) {
          if (!isAllowedStaffLogin(profile.email)) {
            await signOut()
            setError('This account is not authorized for placement office access.')
            return
          }
          router.history.push(placementHomeForRole(profile.role))
          return
        }
      }
      if (next) router.history.push(next)
      else navigate({ to: '/account' })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsSigningIn(false)
    }
  }

  return (
    <>
      <SeoHead title="Login" description="Sign in to the placement office portal." url="https://codetrace.xyz/login" />
      <div className="flex min-h-screen flex-col px-4 py-10 md:px-8">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center">
        <nav className="mb-6 font-mono text-[11px]">
          <Link
            to="/app"
            className="prompt inline-flex items-center uppercase tracking-[0.15em] text-muted-foreground transition-colors hover:text-primary"
          >
            <ArrowLeft className="mr-1.5 size-3" />
            cd ../dashboard
          </Link>
        </nav>

        <div className="term-window scanlines rise-in">
          <div className="term-bar">
            <span className="term-dot" style={{ background: 'var(--term-red)' }} />
            <span className="term-dot" style={{ background: 'var(--term-amber)' }} />
            <span className="term-dot" style={{ background: 'var(--term-green)' }} />
            <span className="ml-2 font-mono text-[11px] text-muted-foreground/80">~/{BRAND_SLUG} — auth</span>
          </div>

          <div className="crt-grid px-6 py-9 md:px-10 md:py-11">
            <p className="font-mono text-[11px] text-muted-foreground">
              <span className="text-[var(--term-green)]">$</span> {BRAND_SLUG} login
            </p>
            <h1 className="glow-text mt-4 font-pixel text-4xl leading-tight text-foreground md:text-5xl">
              Placement office
            </h1>
            <p className="mt-4 max-w-md font-mono text-sm leading-relaxed text-muted-foreground">
              Sign in with your dedicated RCEE staff account to manage student placement records,
              resumes, readiness, and resume books.
            </p>

            <div className="mt-8 grid gap-5 sm:grid-cols-3">
              {PERKS.map((perk) => (
                <div key={perk.title}>
                  <perk.icon className="size-4 text-primary" />
                  <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-foreground">
                    {perk.title}
                  </p>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{perk.text}</p>
                </div>
              ))}
            </div>

            <form onSubmit={handleLogin} className="mt-9 space-y-4">
              <div className="space-y-2">
                <label htmlFor="login-email" className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  email
                </label>
                <Input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Enter email"
                  className="font-mono"
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="login-password" className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  password
                </label>
                <Input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter password"
                  className="font-mono"
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={!isConfigured || isSigningIn || !email.trim() || !password}
                size="lg"
                className="w-full gap-2 font-mono text-sm shadow-lg shadow-primary/25 sm:w-auto sm:px-8"
              >
                <LogIn data-icon="inline-start" />
                {isSigningIn ? 'Signing in…' : 'Sign in'}
              </Button>
              {!isConfigured && (
                <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 font-mono text-xs text-destructive">
                  Supabase env vars are missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
                </p>
              )}
              {error && <p className="font-mono text-xs text-destructive">{error}</p>}
            </form>

            <div className="mt-10 border-t border-border/50 pt-6">
              <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">
                <span className="text-[var(--term-green)]">&gt; </span>tracks all seven platforms
              </p>
              <div className="flex flex-wrap gap-x-5 gap-y-2">
                {ALL_PLATFORMS.map((platform) => (
                  <span
                    key={platform}
                    className="inline-flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground"
                  >
                    <PlatformIcon platform={platform} className="size-3.5" />
                    {PLATFORM_NAMES[platform]}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <AppFooter />
      </div>
    </div>
    </>
  )
}
