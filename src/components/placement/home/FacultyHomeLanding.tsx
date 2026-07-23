import { lazy, Suspense, useMemo } from 'react'
import {
  BookOpenCheck,
  ClipboardList,
  GraduationCap,
  Sparkles,
  Users,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { TrainingProgramCards } from '@/components/placement/TrainingProgramCards'
import {
  ActivityTimeline,
  GlassStatCard,
  HomeEmptyState,
  HomeHero,
  HomeSection,
  MotivationalBanner,
  NewsFeed,
  TopPerformerCard,
} from '@/components/placement/home/HomeKit'
import type { StudentProfileRow } from '@/api/placement/students'
import type { getCampaignSummary } from '@/api/placement/studentUpdateCampaigns'
import {
  pickRoleQuote,
  type HomeNewsItem,
  type HomeTimelineItem,
} from '@/lib/placementHomeContent'
import type { TrainingYear } from '@/lib/trainingPrograms'
import {
  TRAINING_PROGRAMS,
  resolveStudentTrainingAssignment,
} from '@/lib/trainingPrograms'

const LuxuryBarChart = lazy(() =>
  import('@/components/placement/charts/LuxuryBarChart').then((m) => ({ default: m.LuxuryBarChart })),
)

type CampaignSummary = Awaited<ReturnType<typeof getCampaignSummary>>

export function FacultyHomeLanding({
  students,
  campaignSummary,
  base,
  displayName,
  year,
  onYearChange,
  onProgramFilter,
}: {
  students: StudentProfileRow[]
  campaignSummary: CampaignSummary | null
  base: string | null
  displayName: string
  year: TrainingYear | 'all'
  onYearChange: (year: TrainingYear | 'all') => void
  onProgramFilter: (section: string | undefined) => void
}) {
  const quote = useMemo(() => pickRoleQuote('faculty'), [])
  const registeredCount = students.filter((s) => s.registered_via_campaign_id).length

  const programCounts = useMemo(() => {
    const counts: Record<string, number> = { ignite: 0, pinnacle: 0, connect: 0 }
    for (const student of students) {
      const assignment = resolveStudentTrainingAssignment(
        student.section,
        student.batch,
        student.academic_batch,
      )
      if (assignment.program) counts[assignment.program] += 1
    }
    return counts
  }, [students])

  const topPerformers = useMemo(() => {
    return [...students]
      .map((student) => {
        const readiness = Number(student.readiness_score) || 0
        const communication = Number(student.communication_score) || 0
        const cgpa = Number(student.cgpa) || 0
        const overall = Math.round(readiness * 0.5 + communication * 0.35 + Math.min(10, cgpa) * 1.5)
        return { student, readiness, communication, overall }
      })
      .sort((a, b) => b.overall - a.overall)
      .slice(0, 5)
  }, [students])

  const avgReadiness = average(students.map((s) => s.readiness_score))
  const avgCommunication = average(students.map((s) => s.communication_score))
  const avgCgpa = average(students.map((s) => s.cgpa))

  const highlights = useMemo(() => buildFacultyHighlights(students, topPerformers), [students, topPerformers])
  const feed = useMemo(
    () => buildFacultyFeed(students, campaignSummary, registeredCount),
    [students, campaignSummary, registeredCount],
  )
  const timeline = useMemo(
    () => buildFacultyTimeline(campaignSummary, programCounts),
    [campaignSummary, programCounts],
  )

  return (
    <div className="space-y-6">
      <HomeHero
        name={displayName}
        quote={quote}
        illustrationLabel="Mentoring"
        actions={
          base
            ? [
                { label: 'My students', href: `${base}/students`, primary: true },
                { label: 'Evaluate communication', href: `${base}/communication` },
                { label: 'Tech stack', href: `${base}/tech-stack` },
              ]
            : undefined
        }
      />

      <HomeSection title="Faculty dashboard" subtitle="Your mentoring footprint for the selected pass-out year.">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <GlassStatCard label="My students" value={students.length} icon={<Users className="size-5" />} />
          <GlassStatCard label="Avg readiness" value={avgReadiness} hint="Cohort average" icon={<Sparkles className="size-5" />} delay={0.05} />
          <GlassStatCard label="Avg communication" value={avgCommunication} icon={<BookOpenCheck className="size-5" />} delay={0.1} />
          <GlassStatCard label="Campaign registered" value={registeredCount} icon={<ClipboardList className="size-5" />} delay={0.15} />
          {TRAINING_PROGRAMS.map((program, index) => (
            <GlassStatCard
              key={program.id}
              label={program.label}
              value={programCounts[program.id] ?? 0}
              hint="Training program"
              icon={<GraduationCap className="size-5" />}
              delay={0.2 + index * 0.05}
            />
          ))}
          <GlassStatCard label="Avg CGPA" value={avgCgpa} delay={0.35} />
        </div>
      </HomeSection>

      <HomeSection title="Top performers" subtitle="Top 5 by readiness, communication, and academics.">
        {topPerformers.length ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {topPerformers.map((row, index) => (
              <TopPerformerCard
                key={row.student.id}
                rank={index + 1}
                name={row.student.full_name}
                roll={row.student.roll_number}
                readiness={row.readiness}
                communication={row.communication}
                overall={row.overall}
              />
            ))}
          </div>
        ) : (
          <HomeEmptyState
            title="No student achievements yet"
            description="Top performers will appear once student profiles have readiness and communication scores."
          />
        )}
      </HomeSection>

      <div className="grid gap-6 lg:grid-cols-2">
        <HomeSection title="Performance snapshot">
          <Suspense fallback={<Skeleton className="h-72 rounded-[20px]" />}>
            <LuxuryBarChart
              title="Cohort averages"
              subtitle="Attendance proxy uses readiness until dedicated attendance lands"
              data={[
                { name: 'Readiness', value: avgReadiness },
                { name: 'Communication', value: avgCommunication },
                { name: 'CGPA×10', value: Math.round(avgCgpa * 10) },
                { name: 'Registered', value: registeredCount },
              ]}
            />
          </Suspense>
        </HomeSection>
        <HomeSection title="Student highlights">
          <NewsFeed
            items={highlights}
            emptyTitle="No student achievements yet"
            emptyDescription="Celebrations will appear as students earn strong scores and certifications."
          />
        </HomeSection>
      </div>

      <HomeSection title="Faculty feed" subtitle="Recent mentoring and campaign activity.">
        <div className="grid gap-6 lg:grid-cols-2">
          <NewsFeed items={feed} emptyTitle="No recent announcements" emptyDescription="Evaluations and registrations will show up here." />
          <ActivityTimeline items={timeline} />
        </div>
      </HomeSection>

      <HomeSection title="Training programs" subtitle="Jump into Ignite, Pinnacle, or Connect cohorts.">
        <TrainingProgramCards
          selectedYear={year}
          onYearChange={onYearChange}
          onFilter={(filter) => {
            onYearChange(filter.year === 'all' ? 'all' : (filter.year as TrainingYear))
            onProgramFilter(filter.section)
          }}
        />
      </HomeSection>

      <MotivationalBanner quote="Every lesson taught today shapes tomorrow's leaders." />
    </div>
  )
}

function average(values: Array<number | null | undefined>) {
  const valid = values.map(Number).filter((v) => Number.isFinite(v))
  if (!valid.length) return 0
  return Math.round(valid.reduce((a, b) => a + b, 0) / valid.length)
}

function buildFacultyHighlights(
  students: StudentProfileRow[],
  top: Array<{ student: StudentProfileRow; readiness: number; communication: number; overall: number }>,
): HomeNewsItem[] {
  const items: HomeNewsItem[] = []
  for (const row of top.slice(0, 3)) {
    items.push({
      id: `top-${row.student.id}`,
      icon: row.overall >= 80 ? '🏆' : '🥇',
      title: `${row.student.full_name} is excelling`,
      description: `Readiness ${row.readiness} · Communication ${row.communication}.`,
      time: 'Top 5',
    })
  }
  const strongComm = students.filter((s) => (Number(s.communication_score) || 0) >= 80).length
  if (strongComm > 0) {
    items.push({
      id: 'comm',
      icon: '🎖',
      title: `${strongComm} students communication-ready`,
      description: 'Strong interview presence across your mentee set.',
      time: 'Live',
    })
  }
  return items
}

function buildFacultyFeed(
  students: StudentProfileRow[],
  campaignSummary: CampaignSummary | null,
  registeredCount: number,
): HomeNewsItem[] {
  const items: HomeNewsItem[] = []
  if (registeredCount > 0) {
    items.push({
      id: 'reg',
      icon: '📚',
      title: `${registeredCount} students registered via campaigns`,
      description: 'Keep mentoring newly onboarded profiles.',
      time: 'Campaigns',
    })
  }
  if (campaignSummary) {
    items.push({
      id: 'pending',
      icon: '📝',
      title: `${campaignSummary.pending} registrations pending`,
      description: `${campaignSummary.completed} completed · ${campaignSummary.opened} opened.`,
      time: 'Funnel',
    })
  }
  const recent = students
    .filter((s) => s.last_communication_evaluation_at)
    .sort(
      (a, b) =>
        new Date(b.last_communication_evaluation_at || 0).getTime() -
        new Date(a.last_communication_evaluation_at || 0).getTime(),
    )
    .slice(0, 3)
  for (const student of recent) {
    items.push({
      id: `eval-${student.id}`,
      icon: '✅',
      title: `Performance reviewed · ${student.full_name}`,
      description: `Communication score ${student.communication_score ?? '—'}.`,
      time: 'Recent',
    })
  }
  return items
}

function buildFacultyTimeline(
  campaignSummary: CampaignSummary | null,
  programCounts: Record<string, number>,
): HomeTimelineItem[] {
  const items: HomeTimelineItem[] = []
  if (campaignSummary) {
    items.push({
      id: 'campaigns',
      title: 'Registration campaigns',
      description: `${campaignSummary.campaigns} campaigns · ${campaignSummary.students} registrations`,
      date: 'Active',
      tone: 'success',
    })
  }
  for (const program of TRAINING_PROGRAMS) {
    items.push({
      id: program.id,
      title: `${program.label} cohort`,
      description: `${programCounts[program.id] ?? 0} students assigned`,
      date: 'Training',
      tone: 'default',
    })
  }
  return items
}
