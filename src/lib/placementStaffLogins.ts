/** Dedicated placement staff accounts for RCEE. */
export const STAFF_LOGIN_PASSWORD = 'RCE_T&P'

export const STAFF_LOGIN_ACCOUNTS = [
  { role: 'admin', email: 'admin@rcee.ac.in', fullName: 'RCEE Admin' },
  { role: 'tpo', email: 'tpo@rcee.ac.in', fullName: 'RCEE TPO' },
  { role: 'faculty', email: 'faculty@rcee.ac.in', fullName: 'RCEE Faculty' },
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
