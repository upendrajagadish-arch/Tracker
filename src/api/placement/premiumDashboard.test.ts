import { describe, expect, it } from 'vitest'
import {
  canManagePlacementOperations,
  dashboardRecommendation,
  placementEligibilityCounts,
  placementPercentage,
  resolveStudentGraduationBatch,
} from '@/api/placement/premiumDashboard'

describe('premium placement dashboard metrics', () => {
  it('resolves graduation year before academic batch end year', () => {
    expect(
      resolveStudentGraduationBatch({
        graduation_year: 2028,
        academic_batch: '2023-2027',
        batch: '2027',
      }),
    ).toBe('2028')
  })

  it('resolves the ending year of academic batch when graduation year is absent', () => {
    expect(
      resolveStudentGraduationBatch({
        graduation_year: null,
        academic_batch: '2023-2027',
        batch: '',
      }),
    ).toBe('2027')
  })

  it('uses inclusive eligibility thresholds at 60, 70, and 80', () => {
    expect(placementEligibilityCounts([59, 60, 69, 70, 79, 80, 100])).toEqual({
      above60: 6,
      above70: 4,
      above80: 2,
    })
  })

  it('calculates rounded placement percentages safely', () => {
    expect(placementPercentage(2, 3)).toBe(67)
    expect(placementPercentage(0, 0)).toBe(0)
  })

  it('produces deterministic readiness recommendations from score gaps', () => {
    expect(dashboardRecommendation(82, 65).toLowerCase()).toContain('communication')
    expect(dashboardRecommendation(64, 82).toLowerCase()).toContain('technical')
    expect(dashboardRecommendation(74, 72).toLowerCase()).toContain('balanced')
  })

  it('limits operational mutations to admin and TPO roles', () => {
    expect(canManagePlacementOperations('admin')).toBe(true)
    expect(canManagePlacementOperations('tpo')).toBe(true)
    expect(canManagePlacementOperations('faculty')).toBe(false)
    expect(canManagePlacementOperations('interviewer')).toBe(false)
    expect(canManagePlacementOperations(null)).toBe(false)
  })
})

