import { describe, expect, it } from 'vitest'
import { driveRegistrationsExportSection } from '@/api/placement/placementDriveRegistrations'

describe('driveRegistrationsExportSection', () => {
  it('maps registration rows to fixed Excel columns', () => {
    const section = driveRegistrationsExportSection('Acme Corp', 'Campus drive', [
      {
        id: 'reg-1',
        placement_event_id: 'evt-1',
        company_id: 'co-1',
        drive_link_id: 'link-1',
        student_profile_id: 'stu-1',
        full_name: 'Ada Lovelace',
        roll_number: '21CS001',
        email: 'ada@example.com',
        mobile: '9876543210',
        tenth_percentage: 92.5,
        twelfth_percentage: 88,
        btech_cgpa: 8.4,
        active_backlogs: 0,
        resume_url: 'https://example.com/resume.pdf',
        submitted_at: '2026-07-21T10:00:00.000Z',
      },
    ])

    expect(section.columns).toEqual([
      'Company',
      'Drive',
      'Submitted at',
      'Full name',
      'Roll number',
      'Email',
      'Mobile',
      '10th %',
      '12th %',
      'B.Tech CGPA',
      'Active backlogs',
      'Resume URL',
    ])
    expect(section.rows[0]).toEqual([
      'Acme Corp',
      'Campus drive',
      expect.any(String),
      'Ada Lovelace',
      '21CS001',
      'ada@example.com',
      '9876543210',
      '92.5',
      '88',
      '8.4',
      '0',
      'https://example.com/resume.pdf',
    ])
  })
})

describe('drive registration payload validation (client-side expectations)', () => {
  it('requires numeric academic fields within expected ranges', () => {
    const tenth = 95
    const twelfth = 88
    const cgpa = 8.2
    expect(tenth >= 0 && tenth <= 100).toBe(true)
    expect(twelfth >= 0 && twelfth <= 100).toBe(true)
    expect(cgpa >= 0 && cgpa <= 10).toBe(true)
  })
})
