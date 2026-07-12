import { Link, useParams } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { SeoHead } from '@/components/SeoHead'
import { Button } from '@/components/ui/button'
import { AppFooter } from '@/components/AppFooter'
import { getPublicProfileByUsername } from '@/api/savedProfiles'
import { isSupabaseConfigured } from '@/lib/supabase'
import { configToUsernames, hasConfigAccounts } from '@/lib/profileConfig'
import { useAuth } from '@/hooks/useAuth'
import { ProfilePage } from '@/pages/ProfilePage'
import { NotFoundPage } from '@/pages/NotFoundPage'

const RESERVED_PROFILE_USERNAMES = new Set([
  'admin',
  'tpo',
  'faculty',
  'interviewer',
  'student',
  'login',
  'app',
  'account',
  'onboarding',
  'public',
  'profile',
  'placement',
])

function ProfileState({
  title,
  description,
  variant,
}: {
  title: string
  description: string
  variant: 'loading' | 'error' | 'info'
}) {
  const tone =
    variant === 'error'
      ? 'text-destructive/90'
      : variant === 'info'
        ? 'text-muted-foreground'
        : 'text-muted-foreground'

  return (
    <div className="flex min-h-screen flex-col px-4 py-10 md:px-8">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center">
        <div className="term-window scanlines rise-in">
          <div className="term-bar">
            <span className="term-dot" style={{ background: 'var(--term-red)' }} />
            <span className="term-dot" style={{ background: 'var(--term-amber)' }} />
            <span className="term-dot" style={{ background: 'var(--term-green)' }} />
            <span className="ml-2 font-mono text-[11px] text-muted-foreground/80">~/profile</span>
          </div>
          <div className="crt-grid px-6 py-8 text-center md:px-9">
            <h1 className="glow-text font-pixel text-2xl text-foreground">{title}</h1>
            <p className={`mt-3 font-mono text-sm leading-relaxed ${tone}`}>{description}</p>
          </div>
        </div>
      </div>
      <AppFooter />
    </div>
  )
}

function EmptyProfileState({ username, isOwner }: { username: string; isOwner: boolean }) {
  return (
    <>
      <SeoHead title={`@${username}`} url={`https://codetrace.xyz/${username}`} />
      <div className="flex min-h-screen flex-col px-4 py-10 md:px-8">
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center">
          <div className="term-window scanlines rise-in">
            <div className="term-bar">
              <span className="term-dot" style={{ background: 'var(--term-red)' }} />
              <span className="term-dot" style={{ background: 'var(--term-amber)' }} />
              <span className="term-dot" style={{ background: 'var(--term-green)' }} />
              <span className="ml-2 font-mono text-[11px] text-muted-foreground/80">~/{username}</span>
            </div>
            <div className="crt-grid px-6 py-8 text-center md:px-9">
              <h1 className="glow-text font-pixel text-2xl text-foreground">@{username}</h1>
              <p className="mt-3 font-mono text-sm leading-relaxed text-muted-foreground">
                {isOwner
                  ? 'This profile is claimed but no platform accounts are linked yet.'
                  : 'This profile has not published any platform accounts yet.'}
              </p>
              {isOwner ? (
                <Button asChild className="mt-6 font-mono text-xs">
                  <Link to="/account">Finish setup</Link>
                </Button>
              ) : (
                <Button asChild variant="outline" className="mt-6 font-mono text-xs">
                  <Link to="/app">Open dashboard</Link>
                </Button>
              )}
            </div>
          </div>
        </div>
        <AppFooter />
      </div>
    </>
  )
}

export function PublicProfilePage() {
  const { profileUsername } = useParams({ from: '/$profileUsername' })
  const { user } = useAuth()
  const isReserved = RESERVED_PROFILE_USERNAMES.has(profileUsername.toLowerCase())

  const { data, isLoading, error } = useQuery({
    queryKey: ['public-profile', profileUsername],
    queryFn: () => getPublicProfileByUsername(profileUsername),
    enabled: isSupabaseConfigured && !isReserved,
  })

  if (isReserved) return <NotFoundPage />

  if (!isSupabaseConfigured) {
    return (
      <ProfileState
        title="Saved profiles are not configured"
        description="Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable public profile URLs."
        variant="info"
      />
    )
  }

  if (isLoading) {
    return (
      <>
        <SeoHead title={`@${profileUsername}`} url={`https://codetrace.xyz/${profileUsername}`} />
        <ProfileState
          title={`Loading @${profileUsername}`}
          description="Fetching saved account configuration."
          variant="loading"
        />
      </>
    )
  }

  if (error) {
    return (
      <>
        <SeoHead title={`@${profileUsername}`} url={`https://codetrace.xyz/${profileUsername}`} />
        <ProfileState
          title="Profile failed to load"
          description={(error as Error).message}
          variant="error"
        />
      </>
    )
  }

  if (!data) return <NotFoundPage />

  if (!hasConfigAccounts(data.config)) {
    const isOwner = user?.id === data.id
    return <EmptyProfileState username={data.username} isOwner={isOwner} />
  }

  return (
    <>
      <SeoHead title={`@${data.username}`} url={`https://codetrace.xyz/${data.username}`} />
      <ProfilePage
        usernames={configToUsernames(data.config)}
        owner={{
          username: data.username,
          displayName: data.displayName,
          avatarUrl: data.avatarUrl,
        }}
      />
    </>
  )
}
