import type { Platform, Usernames } from '@/types/api'
import type { StudentProfileRow } from '@/api/placement/students'
import { EMPTY_USERNAMES } from '@/lib/profileConfig'

export type PlatformHandles = Partial<Record<Platform, string>>

export function parseGithubUsername(urlOrHandle: string): string {
  const trimmed = urlOrHandle.trim()
  if (!trimmed) return ''
  if (!trimmed.includes('/') && !trimmed.includes('.')) return trimmed.replace(/^@/, '')
  try {
    const url = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`
    const path = new URL(url).pathname
    const parts = path.split('/').filter(Boolean)
    if (parts[0] === 'github.com' || parts[0] === 'www.github.com') return parts[1] ?? ''
    return parts[parts.length - 1] ?? ''
  } catch {
    const segment = trimmed.split('/').filter(Boolean).pop() ?? trimmed
    return segment.replace(/^@/, '')
  }
}

export function resolvePlatformHandles(
  student: Pick<StudentProfileRow, 'github_url' | 'platform_handles'>,
): PlatformHandles {
  const raw = (student.platform_handles ?? {}) as PlatformHandles
  const handles: PlatformHandles = { ...raw }
  if (!handles.github?.trim() && student.github_url?.trim()) {
    const gh = parseGithubUsername(student.github_url)
    if (gh) handles.github = gh
  }
  return Object.fromEntries(
    Object.entries(handles).filter(([, value]) => typeof value === 'string' && value.trim()),
  ) as PlatformHandles
}

export function countLinkedPlatforms(handles: PlatformHandles): number {
  return Object.values(handles).filter((v) => v?.trim()).length
}

export function platformHandlesToUsernames(handles: PlatformHandles): Usernames {
  return {
    ...EMPTY_USERNAMES,
    github: handles.github ?? '',
    leetcode: handles.leetcode ?? '',
    codeforces: handles.codeforces ?? '',
    gfg: handles.gfg ?? '',
    codechef: handles.codechef ?? '',
    hackerrank: handles.hackerrank ?? '',
    tuf: handles.tuf ?? '',
  }
}
