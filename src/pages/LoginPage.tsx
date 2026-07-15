import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useRouter, useSearch } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { SeoHead } from '@/components/SeoHead'
import { ArrowLeft, LogIn, Link2, UserCircle2, Share2, Sparkles } from 'lucide-react'
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
import { BRAND_NAME } from '@/lib/brand'

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
  { icon: UserCircle2, title: 'Student dossiers', text: 'Profiles, resumes, coding traces, and readiness in one console panel.' },
  { icon: Link2, title: 'Platform handles', text: 'Track LeetCode, Codeforces, GitHub, and more per student.' },
  { icon: Share2, title: 'Resume books', text: 'Generate shareable resume books with PDF download for recruiters.' },
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
          <nav className="mb-6">
            <Link
              to="/app"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-secondary transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-4" strokeWidth={2} />
              Back to dashboard
            </Link>
          </nav>

          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="panel-bevel overflow-hidden rounded-dialog"
          >
            <div className="flex items-center justify-between border-b border-console bg-panel-dark/60 px-6 py-4 md:px-8">
              <p className="text-[11px] font-bold uppercase tracking-[0.5px] text-secondary">{BRAND_NAME}</p>
              <span className="xp-chip">
                <Sparkles className="size-3" strokeWidth={2} />
                Staff access
              </span>
            </div>

            <div className="px-6 py-9 md:px-8 md:py-10">
              <h1 className="font-heading text-3xl text-foreground md:text-4xl">
                Placement office
              </h1>
              <p className="mt-3 max-w-md text-base leading-relaxed text-secondary">
                Sign in with your dedicated RCEE staff account to manage student placement records,
                resumes, readiness, and resume books.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                {PERKS.map((perk) => (
                  <div key={perk.title} className="rounded-console border border-console bg-console p-4 shadow-[0_2px_0_#4D5C9A]">
                    <perk.icon className="size-5 text-primary" strokeWidth={2} />
                    <p className="mt-3 font-heading text-sm text-foreground">{perk.title}</p>
                    <p className="mt-1.5 text-xs leading-relaxed text-secondary">{perk.text}</p>
                  </div>
                ))}
              </div>

              <form onSubmit={handleLogin} className="mt-9 space-y-5">
                <div className="space-y-2">
                  <label htmlFor="login-email" className="text-sm font-semibold text-foreground">
                    Email
                  </label>
                  <Input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Enter email"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="login-password" className="text-sm font-semibold text-foreground">
                    Password
                  </label>
                  <Input
                    id="login-password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter password"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  disabled={!isConfigured || isSigningIn || !email.trim() || !password}
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  <LogIn data-icon="inline-start" strokeWidth={2} />
                  {isSigningIn ? 'Signing in…' : 'Sign in'}
                </Button>
                {!isConfigured && (
                  <p className="rounded-console border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary">
                    Supabase env vars are missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
                  </p>
                )}
                {error && <p className="text-sm font-semibold text-primary">{error}</p>}
              </form>

              <div className="mt-10 border-t border-console pt-6">
                <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.5px] text-secondary">
                  Tracks all seven platforms
                </p>
                <div className="flex flex-wrap gap-x-5 gap-y-2">
                  {ALL_PLATFORMS.map((platform) => (
                    <span
                      key={platform}
                      className="inline-flex items-center gap-1.5 text-sm text-secondary"
                    >
                      <PlatformIcon platform={platform} className="size-3.5" />
                      {PLATFORM_NAMES[platform]}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          <AppFooter />
        </div>
      </div>
    </>
  )
}
