import { describe, expect, it } from 'vitest'
import { router } from '@/router'

describe('placement dashboard routes', () => {
  it('registers classic dashboard paths for admin, tpo, and faculty', () => {
    const paths = Object.keys(router.routesByPath)
    expect(paths).toContain('/admin/placement/dashboard')
    expect(paths).toContain('/tpo/placement/dashboard')
    expect(paths).toContain('/faculty/placement/dashboard')
    expect(paths).toContain('/admin/placement')
    expect(paths).toContain('/admin/placement/students')
  })
})
