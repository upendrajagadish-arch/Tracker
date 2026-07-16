import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useRouter, useSearch } from '@tanstack/react-router'
import { motion } from 'framer-motion'
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
import { CollegeLogo } from '@/components/CollegeBrand'
import { BRAND_NAME, COLLEGE_NAME, TNP_CELL } from '@/lib/brand'

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
  { icon: UserCircle2, title: 'Student dossiers', text: 'Profiles, resumes, coding traces, and readiness in one place.' },
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
      <div className="flex flex-1 flex-col px-4 py-8 sm:px-6 md:px-8">
        <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center">
          <nav className="mb-6">
            <Link
              to="/app"
              className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-binance transition-opacity hover:opacity-80"
            >
              <ArrowLeft className="size-4" strokeWidth={2} />
              Back to dashboard
            </Link>
          </nav>

          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden rounded-card border border-soft bg-card"
          >
            <div className="border-b border-soft px-6 py-4 md:px-8">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-binance">
                    {TNP_CELL}
                  </p>
                  <p className="mt-1 text-[13px] font-semibold text-foreground">{COLLEGE_NAME}</p>
                  <p className="mt-0.5 text-[12px] text-muted">{BRAND_NAME}</p>
                </div>
                <CollegeLogo height={40} linkToHome={false} />
              </div>
            </div>

            <div className="px-6 py-8 md:px-8 md:py-10">
              <h1 className="font-heading text-[40px] font-bold tracking-tight text-foreground">
                Placement office
              </h1>
              <p className="mt-3 max-w-md text-[14px] leading-relaxed text-secondary">
                Sign in with your dedicated RCEE staff account to manage student placement records,
                resumes, readiness, and resume books.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                {PERKS.map((perk) => (
                  <div key={perk.title} className="rounded-card border border-soft bg-[#181A20] p-4">
                    <perk.icon className="size-4 text-binance" strokeWidth={2} />
                    <p className="mt-3 text-[14px] font-bold text-foreground">{perk.title}</p>
                    <p className="mt-1.5 text-[12px] leading-relaxed text-secondary">{perk.text}</p>
                  </div>
                ))}
              </div>

              <form onSubmit={handleLogin} className="mt-8 space-y-4">
                <div className="space-y-2">
                  <label htmlFor="login-email" className="text-[14px] font-semibold text-foreground">
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
                  <label htmlFor="login-password" className="text-[14px] font-semibold text-foreground">
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
                  <p className="rounded-button border border-[#F6465D]/35 bg-[#F6465D]/10 px-3 py-2 text-[12px] font-semibold text-[#F6465D]">
                    Supabase env vars are missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
                  </p>
                )}
                {error && <p className="text-[14px] font-semibold text-[#F6465D]">{error}</p>}
              </form>

              <div className="mt-10 border-t border-soft pt-6">
                <p className="mb-3 text-[12px] font-semibold text-muted">
                  Tracks all seven platforms
                </p>
                <div className="flex flex-wrap gap-x-5 gap-y-2">
                  {ALL_PLATFORMS.map((platform) => (
                    <span
                      key={platform}
                      className="inline-flex items-center gap-1.5 text-[13px] text-secondary"
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
