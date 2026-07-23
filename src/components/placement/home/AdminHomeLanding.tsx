import { lazy, Suspense, useMemo } from 'react'
import {
  Building2,
  CalendarDays,
  GraduationCap,
  Target,
  Trophy,
  Users,
  UserCheck,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ActivityTimeline,
  GlassStatCard,
  HomeHero,
  HomeSection,
  InsightCard,
  MotivationalBanner,
  NewsFeed,
} from '@/components/placement/home/HomeKit'
import type { DashboardSnapshot } from '@/api/placement/premiumDashboard'
import {
  branchInsight,
  buildAdminNews,
  buildTpoTimeline,
  pickRoleQuote,
  topBatchInsight,
} from '@/lib/placementHomeContent'

const LuxuryBarChart = lazy(() =>
  import('@/components/placement/charts/LuxuryBarChart').then((m) => ({ default: m.LuxuryBarChart })),
)
const LuxuryDonutChart = lazy(() =>
  import('@/components/placement/charts/LuxuryDonutChart').then((m) => ({ default: m.LuxuryDonutChart })),
)

export function AdminHomeLanding({
  snapshot,
  base,
  displayName,
}: {
  snapshot: DashboardSnapshot
  base: string | null
  displayName: string
}) {
  const quote = useMemo(() => pickRoleQuote('admin'), [])
  const news = useMemo(() => buildAdminNews(snapshot), [snapshot])
  const timeline = useMemo(() => buildTpoTimeline(snapshot), [snapshot])
  const branch = branchInsight(snapshot)
  const batch = topBatchInsight(snapshot)
  const { overview, management, overall, skillBadges } = snapshot

  return (
    <div className="space-y-6">
      <HomeHero
        name={displayName}
        quote={quote}
        illustrationLabel="Leadership"
        actions={
          base
            ? [
                { label: 'Student Tracker', href: `${base}/students`, primary: true },
                { label: 'Operations', href: `${base}/operations` },
                { label: 'Reports', href: `${base}/reports` },
              ]
            : undefined
        }
      />

      <HomeSection title="Institution overview" subtitle="Live cohort pulse across readiness and placement.">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <GlassStatCard label="Total students" value={overview.totalStudents} icon={<Users className="size-5" />} />
          <GlassStatCard
            label="Placement rate"
            value={`${overview.placementPercentage}%`}
            hint={`${overview.placed} placed`}
            icon={<Trophy className="size-5" />}
            delay={0.05}
          />
          <GlassStatCard
            label="70%+ readiness"
            value={overview.above70}
            hint={`${overview.above80} above 80%`}
            icon={<Target className="size-5" />}
            delay={0.1}
          />
          <GlassStatCard
            label="Upcoming drives"
            value={management.upcomingDrives}
            hint={`${management.activeCompanies} active companies`}
            icon={<CalendarDays className="size-5" />}
            delay={0.15}
          />
          <GlassStatCard
            label="Company links"
            value={management.companyLinks}
            icon={<Building2 className="size-5" />}
            delay={0.2}
          />
          <GlassStatCard
            label="Overall readiness"
            value={overall.score}
            hint={overall.recommendation.slice(0, 64) + (overall.recommendation.length > 64 ? '…' : '')}
            icon={<GraduationCap className="size-5" />}
            delay={0.25}
          />
          <GlassStatCard
            label="Tech avg"
            value={overall.tech}
            icon={<UserCheck className="size-5" />}
            delay={0.3}
          />
          <GlassStatCard
            label="Communication avg"
            value={overall.communication}
            delay={0.35}
          />
        </div>
      </HomeSection>

      <div className="grid gap-6 lg:grid-cols-2">
        <HomeSection title="News feed" subtitle="Institution signals and recent activity.">
          <NewsFeed items={news} />
        </HomeSection>
        <HomeSection title="Announcements & drives" subtitle="What needs attention next.">
          <ActivityTimeline items={timeline} />
        </HomeSection>
      </div>

      <HomeSection title="Quick insights">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {branch ? <InsightCard label={branch.label} value={branch.value} /> : null}
          {batch ? <InsightCard label={batch.label} value={batch.value} delay={0.05} /> : null}
          <InsightCard
            label="Highest attendance proxy"
            value={`${overview.above80} students at 80%+ readiness`}
            delay={0.1}
          />
          <InsightCard
            label="Training progress"
            value={`${skillBadges.techTotal} tech · ${skillBadges.communicationTotal} communication badges`}
            delay={0.15}
          />
        </div>
      </HomeSection>

      <HomeSection title="Analytics snapshot" subtitle="Summary charts only — drill into Reports for depth.">
        <Suspense
          fallback={
            <div className="grid gap-4 lg:grid-cols-2">
              <Skeleton className="h-72 rounded-[20px]" />
              <Skeleton className="h-72 rounded-[20px]" />
            </div>
          }
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <LuxuryBarChart
              title="Readiness bands"
              subtitle="Students by readiness threshold"
              data={[
                { name: '60%+', value: overview.above60 },
                { name: '70%+', value: overview.above70 },
                { name: '80%+', value: overview.above80 },
                { name: 'Placed', value: overview.placed },
              ]}
            />
            <LuxuryDonutChart
              title="Placement progress"
              subtitle="Placed vs still preparing"
              data={[
                { name: 'Placed', value: overview.placed, color: '#0ECB81' },
                { name: 'Preparing', value: overview.unplaced, color: '#FF7A00' },
              ]}
              centerLabel="Rate"
              centerValue={`${overview.placementPercentage}%`}
            />
          </div>
        </Suspense>
      </HomeSection>

      <MotivationalBanner quote="Every number represents a student's future. Make every decision count." />
    </div>
  )
}
