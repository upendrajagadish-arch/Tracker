import type { PlacementRole } from '@/lib/placementPermissions'

export type HomeRole = Extract<PlacementRole, 'admin' | 'tpo' | 'faculty' | 'interviewer'>

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
    quote: "Behind every offer letter is someone's hard work.",
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

const INTERVIEWER_QUOTES: HomeQuote[] = [
  {
    quote: 'A great interview unlocks potential that scores alone cannot show.',
    subtitle: 'Listen carefully. Assess fairly. Help talent rise.',
  },
  {
    quote: 'Every candidate deserves a clear, respectful evaluation.',
    subtitle: 'Your judgment shapes careers — stay thorough and kind.',
  },
]

/** Shared product updates shown on every role home. */
export const APP_UPDATES: HomeTimelineItem[] = [
  {
    id: 'classic-dashboard',
    title: 'Classic dashboard moved',
    description: 'Full metrics, charts, and exports now live under Dashboard in the sidebar — Home stays focused on welcome and updates.',
    date: 'New',
    tone: 'success',
  },
  {
    id: 'fame-leaderboard',
    title: 'Fame XP leaderboard',
    description: 'Public and staff leaderboards rank students by Fame XP with stronger weight on coding, CodeNow, and tech stack.',
    date: 'Update',
    tone: 'default',
  },
  {
    id: 'year-filter',
    title: 'Pass-out year filters',
    description: 'Trackers and dashboards scope students by graduation / pass-out year so each cohort stays clean.',
    date: 'Update',
    tone: 'default',
  },
  {
    id: 'campaigns',
    title: 'Student update campaigns',
    description: 'Share registration links so students self-update profiles into the correct pass-out year dashboard.',
    date: 'Feature',
    tone: 'success',
  },
]

const ADMIN_NEWS: HomeNewsItem[] = [
  {
    id: 'ops',
    icon: '📌',
    title: 'Use Dashboard for live metrics',
    description: 'Placement rate, readiness, drives, and exports are on the Dashboard page — not on Home.',
    time: 'Tip',
  },
  {
    id: 'exports',
    icon: '📊',
    title: 'Exports stay on Dashboard',
    description: 'PDF and Excel cohort exports remain available from the Dashboard page.',
    time: 'Info',
  },
  {
    id: 'access',
    icon: '🔐',
    title: 'Role access reminder',
    description: 'Admin, TPO, Faculty, and Interviewer each see navigation matched to their permissions.',
    time: 'Info',
  },
]

const TPO_NEWS: HomeNewsItem[] = [
  {
    id: 'drives',
    icon: '🚀',
    title: 'Plan drives from Operations',
    description: 'Create and track campus placement activity under Operations — Home only surfaces news and product updates.',
    time: 'Tip',
  },
  {
    id: 'eligible',
    icon: '🎯',
    title: 'Eligibility lives on Dashboard',
    description: 'Cohort readiness, placed counts, and company pulse are on Dashboard for focused planning.',
    time: 'Info',
  },
  {
    id: 'campaigns-news',
    icon: '📨',
    title: 'Campaigns for profile updates',
    description: 'Share student update links so registrations land in the right pass-out year.',
    time: 'Tip',
  },
]

const FACULTY_NEWS: HomeNewsItem[] = [
  {
    id: 'mentor',
    icon: '🎓',
    title: 'Mentoring tools stay in the sidebar',
    description: 'Students, Tech Stack, and Communication Evaluation pages hold evaluations and cohort work — Home is welcome-only.',
    time: 'Tip',
  },
  {
    id: 'eval',
    icon: '✍️',
    title: 'Communication evaluations',
    description: 'Record performance reviews from Communication Evaluation; results feed readiness views elsewhere.',
    time: 'Info',
  },
  {
    id: 'training',
    icon: '🧩',
    title: 'Ignite · Pinnacle · Connect',
    description: 'Training program cohorts and bulk uploads live under Tech Stack — open Dashboard for the full faculty table.',
    time: 'Info',
  },
]

const INTERVIEWER_NEWS: HomeNewsItem[] = [
  {
    id: 'students',
    icon: '👥',
    title: 'Student dossiers',
    description: 'Open Students from the sidebar to review profiles ahead of campus interviews.',
    time: 'Tip',
  },
  {
    id: 'ops-int',
    icon: '🗓️',
    title: 'Placement operations',
    description: 'Check Operations for drive context and scheduling notes relevant to interviews.',
    time: 'Info',
  },
  {
    id: 'fair',
    icon: '⚖️',
    title: 'Fair assessment',
    description: 'Keep notes consistent and evidence-based so every candidate gets a clear outcome.',
    time: 'Reminder',
  },
]

const ROLE_NEWS: Record<HomeRole, HomeNewsItem[]> = {
  admin: ADMIN_NEWS,
  tpo: TPO_NEWS,
  faculty: FACULTY_NEWS,
  interviewer: INTERVIEWER_NEWS,
}

const ROLE_ILLUSTRATION: Record<HomeRole, string> = {
  admin: 'Leadership',
  tpo: 'Careers',
  faculty: 'Mentoring',
  interviewer: 'Interviews',
}

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
  const pool =
    role === 'admin'
      ? ADMIN_QUOTES
      : role === 'tpo'
        ? TPO_QUOTES
        : role === 'faculty'
          ? FACULTY_QUOTES
          : INTERVIEWER_QUOTES
  return pool[seed % pool.length]!
}

export function importantNewsForRole(role: HomeRole): HomeNewsItem[] {
  return ROLE_NEWS[role]
}

export function illustrationLabelForRole(role: HomeRole): string {
  return ROLE_ILLUSTRATION[role]
}
