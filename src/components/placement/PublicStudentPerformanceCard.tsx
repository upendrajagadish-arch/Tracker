import type { ReactNode } from 'react'
import { useMemo } from 'react'
import type { Platform, Usernames } from '@/types/api'
import { useProfileCards } from '@/hooks/useCards'
import { splitAccounts } from '@/lib/utils'
import { ALL_PLATFORMS } from '@/api/unifiedClient'
import { SummaryStrip } from '@/components/SummaryStrip'
import { PlatformCard } from '@/components/PlatformCard'
import { GitHubCard } from '@/components/GitHubCard'
import { LeetCodeCard } from '@/components/LeetCodeCard'
import { CodeforcesCard } from '@/components/CodeforcesCard'
import { GFGCard } from '@/components/GFGCard'
import { CodeChefCard } from '@/components/CodeChefCard'
import { HackerRankCard } from '@/components/HackerRankCard'
import { TUFCard } from '@/components/TUFCard'
import { PlacementLoadingBlock } from '@/components/placement/PlacementStates'
import {
  PlacementStatusBadge,
  ReadinessStatusBadge,
} from '@/components/placement/PlacementBadges'
import type { PublicStudentPerformance } from '@/api/placement/studentShare'
import {
  platformHandlesToUsernames,
  resolvePlatformHandles,
} from '@/lib/studentPlatformHandles'
import type { StudentProfileRow } from '@/api/placement/students'

const CARD_RENDERERS: Record<Platform, (username: string) => ReactNode> = {
  github: (u) => <GitHubCard username={u} />,
  leetcode: (u) => <LeetCodeCard username={u} />,
  codeforces: (u) => <CodeforcesCard username={u} />,
  gfg: (u) => <GFGCard username={u} />,
  codechef: (u) => <CodeChefCard username={u} />,
  hackerrank: (u) => <HackerRankCard username={u} />,
  tuf: (u) => <TUFCard username={u} />,
}

function hasAnyUsername(usernames: Usernames) {
  return ALL_PLATFORMS.some((platform) => usernames[platform]?.trim())
}

export function PublicStudentPerformanceCard({ profile }: { profile: PublicStudentPerformance }) {
  const pseudoStudent = {
    github_url: '',
    platform_handles: profile.platformHandles,
  } as Pick<StudentProfileRow, 'github_url' | 'platform_handles'>

  const usernames = useMemo(
    () => platformHandlesToUsernames(resolvePlatformHandles(pseudoStudent)),
    [profile.platformHandles],
  )

  const { loaded, isLoading, activeCount } = useProfileCards(usernames)
  const showCoding = hasAnyUsername(usernames)

  return (
    <div className="fade-in mx-auto max-w-5xl px-4 py-10 md:px-8 md:py-14">
      <header className="term-window scanlines mb-8">
        <div className="term-bar">
          <span className="term-dot" style={{ background: 'var(--term-red)' }} />
          <span className="term-dot" style={{ background: 'var(--term-amber)' }} />
          <span className="term-dot" style={{ background: 'var(--term-green)' }} />
          <span className="ml-2 font-mono text-[11px] text-muted-foreground/80">~/shared/student-performance</span>
        </div>
        <div className="crt-grid px-6 py-8 md:px-9">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">Student performance</p>
          <h1 className="mt-3 font-pixel text-3xl text-foreground md:text-4xl">{profile.fullName}</h1>
          <p className="mt-2 font-mono text-sm text-muted-foreground">
            {profile.rollNumber} · {profile.branch || '—'} · {profile.batch || '—'}
          </p>
        </div>
      </header>

      <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-border bg-card/60 px-4 py-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Readiness score</p>
          <p className="mt-2 font-pixel text-3xl text-primary">{profile.readinessScore}</p>
          <div className="mt-2">
            <ReadinessStatusBadge status={profile.readinessStatus} />
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card/60 px-4 py-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">CGPA</p>
          <p className="mt-2 font-pixel text-3xl text-foreground">{profile.cgpa ?? '—'}</p>
        </div>
        <div className="rounded-lg border border-border bg-card/60 px-4 py-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Placement</p>
          <div className="mt-3">
            <PlacementStatusBadge status={profile.placementStatus} />
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card/60 px-4 py-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Problems solved</p>
          <p className="mt-2 font-pixel text-3xl text-foreground">
            {loaded.length
              ? loaded
                  .filter((card) => card.category !== 'development')
                  .reduce((sum, card) => sum + (card.stats.totalSolved ?? 0), 0)
              : profile.totalSolved}
          </p>
          <p className="mt-1 font-mono text-[10px] text-muted-foreground">
            {profile.linkedCount || activeCount} platform{(profile.linkedCount || activeCount) === 1 ? '' : 's'} linked
          </p>
        </div>
      </section>

      {profile.skillsSummary ? (
        <p className="mb-6 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Skills:</span> {profile.skillsSummary}
        </p>
      ) : null}
      {profile.careerInterest ? (
        <p className="mb-8 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Career interest:</span> {profile.careerInterest}
        </p>
      ) : null}

      {showCoding ? (
        <>
          {isLoading && !loaded.length ? (
            <PlacementLoadingBlock label="Loading coding platform results…" />
          ) : (
            <>
              <SummaryStrip usernames={usernames} />
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {(Object.entries(usernames) as [Platform, string][])
                  .flatMap(([platform, value]) =>
                    splitAccounts(value).map((username) => ({ platform, username })),
                  )
                  .map(({ platform, username }, index) => (
                    <PlatformCard
                      key={`${platform}-${username}`}
                      platform={platform}
                      username={username}
                      animIndex={index}
                    >
                      {CARD_RENDERERS[platform](username)}
                    </PlatformCard>
                  ))}
              </div>
            </>
          )}
        </>
      ) : (
        <div className="rounded-lg border border-dashed border-border bg-card/40 px-6 py-10 text-center text-sm text-muted-foreground">
          No coding platform accounts are linked for this student yet.
        </div>
      )}

      <p className="mt-10 text-center font-mono text-[10px] text-muted-foreground/60">
        Shared student performance · no login required
      </p>
    </div>
  )
}
