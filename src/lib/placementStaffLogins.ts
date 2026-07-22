/** Dedicated placement staff accounts for RCEE. Passwords are never stored in client code. */
export const STAFF_LOGIN_ACCOUNTS = [
  { role: 'admin', email: 'admin@rcee.ac.in', fullName: 'RCEE Admin' },
  { role: 'tpo', email: 'tpo@rcee.ac.in', fullName: 'RCEE TPO' },
  { role: 'faculty', email: 'faculty@rcee.ac.in', fullName: 'RCEE Faculty' },
  {
    role: 'faculty',
    email: 'sridurgadevipujari@rcee.ac.in',
    fullName: 'Sri Durga Devi Pujari',
  },
  {
    role: 'faculty',
    email: 'shaiknasira@rcee.ac.in',
    fullName: 'Shaik Nasira',
  },
  { role: 'interviewer', email: 'interviewer@rcee.ac.in', fullName: 'RCEE Interviewer' },
] as const

const ALLOWED_STAFF_EMAILS = new Set(
  STAFF_LOGIN_ACCOUNTS.map((account) => account.email.toLowerCase()),
)

export function isAllowedStaffLogin(email: string): boolean {
  return ALLOWED_STAFF_EMAILS.has(email.trim().toLowerCase())
}

export const RETIRED_STAFF_EMAILS = [
  'admin@tracker.local',
  'tpo@tracker.local',
  'faculty@tracker.local',
  'interviewer@tracker.local',
  'hr@tracker.local',
  'student@tracker.local',
] as const
