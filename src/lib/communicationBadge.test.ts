import { describe, expect, it } from 'vitest'
import {
  badgeStudentsToCsv,
  classifyCommunicationBadge,
  communicationBadgePercent,
  formatCommunicationBadge,
  isCommunicationBadge,
  totalScoreFromPercentage,
  COMMUNICATION_BADGE_THRESHOLDS,
  COMMUNICATION_MAX_SCORE,
  type CommunicationBadgeCsvRow,
} from '@/lib/communicationBadge'
import {
  assertCanViewCommunicationModule,
  canViewCommunicationModule,
} from '@/lib/placementNavigation'

describe('communication badge thresholds', () => {
  it('classifies gold 200–250', () => {
    expect(classifyCommunicationBadge(200)).toBe('gold')
    expect(classifyCommunicationBadge(215)).toBe('gold')
    expect(classifyCommunicationBadge(250)).toBe('gold')
    expect(COMMUNICATION_BADGE_THRESHOLDS.gold.min).toBe(200)
    expect(COMMUNICATION_BADGE_THRESHOLDS.gold.max).toBe(COMMUNICATION_MAX_SCORE)
  })

  it('classifies silver 150–199', () => {
    expect(classifyCommunicationBadge(150)).toBe('silver')
    expect(classifyCommunicationBadge(175)).toBe('silver')
    expect(classifyCommunicationBadge(199)).toBe('silver')
  })

  it('classifies bronze 100–149', () => {
    expect(classifyCommunicationBadge(100)).toBe('bronze')
    expect(classifyCommunicationBadge(125)).toBe('bronze')
    expect(classifyCommunicationBadge(149)).toBe('bronze')
  })

  it('classifies poor 0–99', () => {
    expect(classifyCommunicationBadge(0)).toBe('poor')
    expect(classifyCommunicationBadge(50)).toBe('poor')
    expect(classifyCommunicationBadge(99)).toBe('poor')
  })

  it('rejects invalid scores', () => {
    expect(classifyCommunicationBadge(null)).toBeNull()
    expect(classifyCommunicationBadge(undefined)).toBeNull()
    expect(classifyCommunicationBadge(-1)).toBeNull()
    expect(classifyCommunicationBadge(251)).toBeNull()
  })

  it('validates badge ids', () => {
    expect(isCommunicationBadge('gold')).toBe(true)
    expect(isCommunicationBadge('poor')).toBe(true)
    expect(isCommunicationBadge('platinum')).toBe(false)
  })

  it('formats badge labels', () => {
    expect(formatCommunicationBadge('gold')).toContain('Gold')
    expect(formatCommunicationBadge(null)).toBe('—')
  })

  it('derives total score from percentage', () => {
    expect(totalScoreFromPercentage(86)).toBe(215)
    expect(totalScoreFromPercentage(null)).toBeNull()
  })

  it('computes percentage of filtered students', () => {
    expect(communicationBadgePercent(34, 100)).toBe(34)
    expect(communicationBadgePercent(1, 0)).toBe(0)
  })
})

describe('communication badge permissions', () => {
  it('allows admin, tpo, faculty', () => {
    expect(canViewCommunicationModule('admin')).toBe(true)
    expect(canViewCommunicationModule('tpo')).toBe(true)
    expect(canViewCommunicationModule('faculty')).toBe(true)
  })

  it('denies student, hr, interviewer', () => {
    expect(canViewCommunicationModule('student')).toBe(false)
    expect(canViewCommunicationModule('hr')).toBe(false)
    expect(canViewCommunicationModule('interviewer')).toBe(false)
    expect(canViewCommunicationModule(null)).toBe(false)
  })

  it('assert throws 403 for unauthorized roles', () => {
    expect(() => assertCanViewCommunicationModule('student')).toThrow(/403/)
    expect(() => assertCanViewCommunicationModule('hr')).toThrow(/403/)
    expect(() => assertCanViewCommunicationModule('admin')).not.toThrow()
  })
})

describe('communication badge CSV export', () => {
  it('exports selected badge columns only', () => {
    const rows: CommunicationBadgeCsvRow[] = [
      {
        rollNumber: 'CSE001',
        fullName: 'Ada Lovelace',
        branch: 'CSE',
        academicBatch: '2024-2028',
        totalScore: 215,
        percentage: 86,
        grade: 'A',
        badge: 'gold',
      },
    ]
    const csv = badgeStudentsToCsv(rows)
    expect(csv).toContain(
      'Roll Number,Name,Branch,Academic Batch,Communication Score,Percentage,Grade,Badge',
    )
    expect(csv).toContain('CSE001,Ada Lovelace,CSE,2024-2028,215,86,A,gold')
    expect(csv).not.toContain('Coding')
  })
})

describe('communication badge pagination helpers', () => {
  it('slices pages without loading all into one browser page', () => {
    const all = Array.from({ length: 120 }, (_, i) => i)
    const page = 2
    const limit = 50
    const from = (page - 1) * limit
    const slice = all.slice(from, from + limit)
    expect(slice).toHaveLength(50)
    expect(slice[0]).toBe(50)
    expect(Math.ceil(all.length / limit)).toBe(3)
  })
})

describe('communication dashboard API response shape', () => {
  it('builds summary counts and percentages for filtered cohort', () => {
    const rows = [
      { badge: 'gold' as const },
      { badge: 'gold' as const },
      { badge: 'silver' as const },
      { badge: 'bronze' as const },
      { badge: 'poor' as const },
    ]
    const goldCount = rows.filter((r) => r.badge === 'gold').length
    const silverCount = rows.filter((r) => r.badge === 'silver').length
    const bronzeCount = rows.filter((r) => r.badge === 'bronze').length
    const poorCount = rows.filter((r) => r.badge === 'poor').length
    const filteredTotal = rows.length
    const response = {
      goldCount,
      silverCount,
      bronzeCount,
      poorCount,
      filteredTotal,
      goldPercent: communicationBadgePercent(goldCount, filteredTotal),
      silverPercent: communicationBadgePercent(silverCount, filteredTotal),
      bronzePercent: communicationBadgePercent(bronzeCount, filteredTotal),
      poorPercent: communicationBadgePercent(poorCount, filteredTotal),
    }
    expect(response).toEqual({
      goldCount: 2,
      silverCount: 1,
      bronzeCount: 1,
      poorCount: 1,
      filteredTotal: 5,
      goldPercent: 40,
      silverPercent: 20,
      bronzePercent: 20,
      poorPercent: 20,
    })
  })

  it('filters badge list by batch and branch', () => {
    const rows = [
      { badge: 'gold' as const, academicBatch: '2024-2028', branch: 'CSE', name: 'A' },
      { badge: 'gold' as const, academicBatch: '2025-2029', branch: 'IT', name: 'B' },
      { badge: 'silver' as const, academicBatch: '2024-2028', branch: 'CSE', name: 'C' },
    ]
    const filtered = rows.filter(
      (r) => r.badge === 'gold' && r.academicBatch === '2024-2028' && r.branch === 'CSE',
    )
    expect(filtered).toHaveLength(1)
    expect(filtered[0]?.name).toBe('A')
  })
})
