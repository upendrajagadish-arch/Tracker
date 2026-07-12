import { ALL_PLATFORMS, fetchUnifiedEnvelope } from '@/api/unifiedClient'
import type { Platform } from '@/types/api'
import type { UnifiedRating, UnifiedStats } from '@/types/unified'
import type { StudentProfileRow } from '@/api/placement/students'
import { resolvePlatformHandles } from '@/lib/studentPlatformHandles'

export interface PlatformTraceEntry {
  platform: Platform
  username: string
  totalSolved: number
  currentRating: number | null
  maxRating: number | null
  error?: string | null
}

export interface StudentCodingTraceResult {
  platforms: PlatformTraceEntry[]
  totalSolved: number
  linkedCount: number
}

async function fetchPlatformTrace(platform: Platform, username: string): Promise<PlatformTraceEntry> {
  try {
    const [statsEnv, ratingEnv] = await Promise.all([
      fetchUnifiedEnvelope<UnifiedStats>(platform, username, 'stats'),
      fetchUnifiedEnvelope<UnifiedRating>(platform, username, 'rating'),
    ])
    return {
      platform,
      username,
      totalSolved: statsEnv.data?.totalSolved ?? 0,
      currentRating: ratingEnv.data?.current ?? null,
      maxRating: ratingEnv.data?.max ?? null,
    }
  } catch (error) {
    return {
      platform,
      username,
      totalSolved: 0,
      currentRating: null,
      maxRating: null,
      error: error instanceof Error ? error.message : 'Fetch failed',
    }
  }
}

export async function fetchStudentCodingTrace(
  student: Pick<StudentProfileRow, 'github_url' | 'platform_handles'>,
): Promise<StudentCodingTraceResult> {
  const handles = resolvePlatformHandles(student)
  const tasks = ALL_PLATFORMS.map(async (platform) => {
    const username = handles[platform]?.trim()
    if (!username) return null
    return fetchPlatformTrace(platform, username)
  })
  const results = await Promise.all(tasks)
  const platforms = results.filter((entry): entry is PlatformTraceEntry => entry != null)
  return {
    platforms,
    totalSolved: platforms.reduce((sum, entry) => sum + entry.totalSolved, 0),
    linkedCount: platforms.length,
  }
}
