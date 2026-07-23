import { lazy, Suspense, useMemo } from 'react'
import {
  BriefcaseBusiness,
  CalendarDays,
  Sparkles,
  Target,
  Trophy,
  Users,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ActivityTimeline,
  GlassStatCard,
  HomeEmptyState,
  HomeHero,
  HomeSection,
  MotivationalBanner,
  NewsFeed,
  SuccessStoryCard,
} from '@/components/placement/home/HomeKit'
import type { DashboardSnapshot } from '@/api/placement/premiumDashboard'
import {
  buildTpoNews,
  buildTpoTimeline,
  pickRoleQuote,
} from '@/lib/placementHomeContent'

const LuxuryBarChart = lazy(() =>
  import('@/components/placement/charts/LuxuryBarChart').then((m) => ({ default: m.LuxuryBarChart })),
)

export function TpoHomeLanding({
  snapshot,
  base,
  displayName,
}: {
  snapshot: DashboardSnapshot
  base: string | null
  displayName: string
}) {
  const quote = useMemo(() => pickRoleQuote('tpo'), [])
  const motivator = useMemo(() => pickRoleQuote('tpo', Date.now() + 3).quote, [])
  const news = useMemo(() => buildTpoNews(snapshot), [snapshot])
  const timeline = useMemo(() => buildTpoTimeline(snapshot), [snapshot])
  const { overview, management, overall, leaderboard, upcomingEvents } = snapshot

  const eligible = overview.above60
  const trained = Math.max(overview.above70, skillSafe(snapshot))

  return (
    <div className="space-y-6">
      <HomeHero
        name={displayName}
        quote={quote}
        illustrationLabel="Careers"
        actions={
          base
            ? [
                { label: 'Open drives', href: `${base}/operations`, primary: true },
                { label: 'Students', href: `${base}/students` },
                { label: 'Campaigns', href: `${base}/student-update-campaigns` },
              ]
            : undefined
        }
      />

      <HomeSection title="Placement pulse" subtitle="Eligibility, training, and opportunity at a glance.">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <GlassStatCard label="Students eligible" value={eligible} hint="60%+ readiness" icon={<Target className="size-5" />} />
          <GlassStatCard label="Students trained" value={trained} hint="Strong readiness band" icon={<Users className="size-5" />} delay={0.05} />
          <GlassStatCard label="Company drives" value={management.upcomingDrives} icon={<CalendarDays className="size-5" />} delay={0.1} />
          <GlassStatCard label="Active companies" value={management.activeCompanies} icon={<BriefcaseBusiness className="size-5" />} delay={0.15} />
          <GlassStatCard label="Offers / placed" value={overview.placed} hint={`${overview.unplaced} still preparing`} icon={<Trophy className="size-5" />} delay={0.2} />
          <GlassStatCard label="Placement rate" value={`${overview.placementPercentage}%`} delay={0.25} />
          <GlassStatCard label="Tech readiness" value={overall.tech} delay={0.3} />
          <GlassStatCard label="Interview readiness" value={overall.communication} hint="Communication average" icon={<Sparkles className="size-5" />} delay={0.35} />
        </div>
      </HomeSection>

      <div className="grid gap-6 lg:grid-cols-2">
        <HomeSection title="Success stories" subtitle="Top performers from the live leaderboard.">
          {leaderboard.length ? (
            <div className="grid gap-3">
              {leaderboard.slice(0, 5).map((row) => (
                <SuccessStoryCard
                  key={`${row.rank}-${row.rollNumber}`}
                  rank={row.rank}
                  name={row.fullName}
                  roll={row.rollNumber}
                  detail={`${row.fameXp.toLocaleString()} XP · Rising career signal`}
                />
              ))}
            </div>
          ) : (
            <HomeEmptyState
              title="No student achievements yet"
              description="Leaderboard stories will appear as students build coding and placement momentum."
            />
          )}
        </HomeSection>

        <HomeSection title="Training news feed" subtitle="Momentum across the placement office.">
          <NewsFeed items={news} emptyTitle="No training updates" emptyDescription="As sessions complete, highlights will stream here." />
        </HomeSection>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <HomeSection title="Upcoming events" subtitle="Drives, deadlines, and campus sessions.">
          <ActivityTimeline items={timeline} />
        </HomeSection>
        <HomeSection title="Pipeline snapshot">
          <Suspense fallback={<Skeleton className="h-72 rounded-[20px]" />}>
            <LuxuryBarChart
              title="Cohort readiness"
              subtitle="Placement funnel from readiness to offers"
              data={[
                { name: 'Eligible', value: eligible },
                { name: 'Trained', value: trained },
                { name: 'Drives', value: management.upcomingDrives },
                { name: 'Placed', value: overview.placed },
              ]}
            />
          </Suspense>
          {upcomingEvents.length === 0 ? (
            <p className="mt-3 text-[12px] text-[#A1A1AA]">
              Tip: add campus drives in Operations to populate the timeline.
            </p>
          ) : null}
        </HomeSection>
      </div>

      <MotivationalBanner quote={motivator} />
    </div>
  )
}

function skillSafe(snapshot: DashboardSnapshot) {
  return Math.round((snapshot.skillBadges.techTotal + snapshot.skillBadges.communicationTotal) / 2) || 0
}
