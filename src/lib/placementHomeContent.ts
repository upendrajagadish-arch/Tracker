import type { DashboardSnapshot } from '@/api/placement/premiumDashboard'
import type { PlacementRole } from '@/lib/placementPermissions'

export type HomeRole = Extract<PlacementRole, 'admin' | 'tpo' | 'faculty'>

export interface HomeQuote {
  quote: string
  subtitle: string
}

export interface HomeNewsItem {
  id: string
  icon: string
  title: string
  description: string
  time: string
}

export interface HomeTimelineItem {
  id: string
  title: string
  description: string
  date: string
  tone?: 'default' | 'success' | 'warn'
}

const ADMIN_QUOTES: HomeQuote[] = [
  {
    quote: 'Great institutions are built by leaders who empower every student to succeed.',
    subtitle: 'Today is another opportunity to shape future careers.',
  },
  {
    quote: "Every number represents a student's future. Make every decision count.",
    subtitle: 'Lead with clarity. Measure what matters. Lift the cohort.',
  },
]

const TPO_QUOTES: HomeQuote[] = [
  {
    quote: "Every placement changes a family's future.",
    subtitle: 'Your guidance creates careers. Your effort creates opportunities.',
  },
  {
    quote: 'Behind every offer letter is someone\'s hard work.',
    subtitle: 'Turn readiness into opportunity — one student at a time.',
  },
]

const FACULTY_QUOTES: HomeQuote[] = [
  {
    quote: "A teacher's greatest achievement is seeing students become successful.",
    subtitle: "Every lesson taught today shapes tomorrow's leaders.",
  },
  {
    quote: "Every lesson taught today shapes tomorrow's leaders.",
    subtitle: 'Mentor with patience. Measure growth. Celebrate progress.',
  },
]

export function greetingForHour(hour = new Date().getHours()): 'Good Morning' | 'Good Afternoon' | 'Good Evening' {
  if (hour < 12) return 'Good Morning'
  if (hour < 17) return 'Good Afternoon'
  return 'Good Evening'
}

export function formatHomeDate(date = new Date()): string {
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export function pickRoleQuote(role: HomeRole, seed = Date.now()): HomeQuote {
  const pool = role === 'admin' ? ADMIN_QUOTES : role === 'tpo' ? TPO_QUOTES : FACULTY_QUOTES
  return pool[seed % pool.length]!
}

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const mins = Math.max(0, Math.round(ms / 60000))
  if (mins < 60) return `${mins || 1}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  return `${days}d ago`
}

export function buildAdminNews(snapshot: DashboardSnapshot | null): HomeNewsItem[] {
  if (!snapshot) return []
  const items: HomeNewsItem[] = []
  const { overview, management, skillBadges, activities } = snapshot

  if (overview.totalStudents > 0) {
    items.push({
      id: 'students',
      icon: '🎓',
      title: `${overview.totalStudents.toLocaleString()} students in scope`,
      description: `${overview.placementPercentage}% placement progress · ${overview.above70} at 70%+ readiness.`,
      time: 'Live',
    })
  }
  if (management.upcomingDrives > 0) {
    items.push({
      id: 'drives',
      icon: '🚀',
      title: `${management.upcomingDrives} upcoming drive${management.upcomingDrives === 1 ? '' : 's'}`,
      description: `${management.activeCompanies} active companies · ${management.companyLinks} share links ready.`,
      time: 'Upcoming',
    })
  }
  const gold = skillBadges.tech.gold + skillBadges.communication.gold
  if (gold > 0) {
    items.push({
      id: 'badges',
      icon: '🏆',
      title: `${gold} gold badges earned`,
      description: 'Tech and communication excellence across the cohort.',
      time: 'This cycle',
    })
  }
  for (const activity of activities.slice(0, 4)) {
    items.push({
      id: activity.id,
      icon: '📈',
      title: activity.action,
      description: activity.description,
      time: relativeTime(activity.createdAt),
    })
  }
  return items
}

export function buildTpoNews(snapshot: DashboardSnapshot | null): HomeNewsItem[] {
  if (!snapshot) return []
  const items = buildAdminNews(snapshot)
  if (snapshot.overview.placed > 0) {
    items.unshift({
      id: 'placed',
      icon: '🎉',
      title: `${snapshot.overview.placed} students marked placed`,
      description: `${snapshot.overview.unplaced} still preparing — keep coaching momentum.`,
      time: 'Live',
    })
  }
  return items
}

export function buildTpoTimeline(snapshot: DashboardSnapshot | null): HomeTimelineItem[] {
  if (!snapshot) return []
  const fromEvents = snapshot.upcomingEvents.slice(0, 6).map((event) => ({
    id: event.id,
    title: event.title || 'Campus event',
    description: event.notes || event.event_type || event.venue || 'Placement activity',
    date: event.starts_at
      ? new Date(event.starts_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      : 'TBD',
    tone: 'default' as const,
  }))
  if (fromEvents.length) return fromEvents
  return [
    {
      id: 'resume',
      title: 'Resume review sessions',
      description: 'Schedule targeted reviews for eligible students.',
      date: 'Plan',
      tone: 'warn',
    },
    {
      id: 'mock',
      title: 'Mock interviews',
      description: 'Build confidence before company drives.',
      date: 'Plan',
      tone: 'default',
    },
  ]
}

export function branchInsight(snapshot: DashboardSnapshot | null): { label: string; value: string } | null {
  if (!snapshot?.studentDetails.length) return null
  const counts = new Map<string, number>()
  for (const student of snapshot.studentDetails) {
    const branch = student.branch?.trim() || 'Unassigned'
    counts.set(branch, (counts.get(branch) ?? 0) + 1)
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]
  if (!top) return null
  return { label: 'Most active department', value: `${top[0]} · ${top[1]} students` }
}

export function topBatchInsight(snapshot: DashboardSnapshot | null): { label: string; value: string } | null {
  if (!snapshot) return null
  const year = snapshot.skillBadges.byYear
    .filter((row) => row.year !== 'All')
    .sort((a, b) => b.techAvg + b.communicationAvg - (a.techAvg + a.communicationAvg))[0]
  if (!year) return null
  return {
    label: 'Top performing batch',
    value: `${year.year} · avg ${Math.round((year.techAvg + year.communicationAvg) / 2)}`,
  }
}
