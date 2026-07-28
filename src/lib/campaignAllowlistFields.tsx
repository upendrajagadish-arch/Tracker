import type { ReactNode } from 'react'
import { ALL_PLATFORMS } from '@/api/unifiedClient'
import { certificationLinksFromSummary } from '@/lib/certificationsSummary'
import { displayAcademicBatch } from '@/lib/academicBatch'
import type { CampaignRegistrantRow } from '@/api/placement/studentUpdateCampaigns'

const FIELD_LABELS: Record<string, string> = {
  roll_number: 'Roll number',
  full_name: 'Full name',
  email: 'Email',
  phone: 'Phone',
  branch: 'Branch',
  batch: 'Year of pass out',
  academic_batch: 'Academic batch',
  section: 'Training program',
  date_of_birth: 'Date of birth',
  cgpa: 'CGPA',
  active_backlogs: 'Active backlogs',
  placement_status: 'Placement status',
  is_placement_eligible: 'Placement eligible',
  linkedin_url: 'LinkedIn URL',
  github_url: 'GitHub profile URL',
  portfolio_url: 'Portfolio URL',
  skills_summary: 'Skills summary',
  career_interest: 'Career interest',
  projects_summary: 'Projects summary',
  certifications_summary: 'Certification links',
  platform_handles: 'Coding platform handles',
  resume: 'Resume',
}

for (const platform of ALL_PLATFORMS) {
  FIELD_LABELS[`platform_handles.${platform}`] = `${platform.charAt(0).toUpperCase()}${platform.slice(1)} handle`
}

export function campaignFieldLabel(key: string): string {
  return FIELD_LABELS[key] ?? key.replace(/_/g, ' ')
}

export interface CampaignRegistrantFieldRow {
  key: string
  label: string
  value: ReactNode
}

function linkValue(url: string | null | undefined): ReactNode {
  const trimmed = url?.trim()
  if (!trimmed) return '—'
  const href = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`
  return (
    <a href={href} target="_blank" rel="noreferrer" className="break-all text-primary hover:underline">
      {trimmed}
    </a>
  )
}

export function buildCampaignRegistrantFields(
  registrant: CampaignRegistrantRow,
  allowlistedFields: string[],
  resumeUploaded: boolean | null,
): CampaignRegistrantFieldRow[] {
  const allowed = new Set(allowlistedFields)
  const has = (field: string) => allowed.has(field)
  const handles =
    registrant.platform_handles && typeof registrant.platform_handles === 'object'
      ? (registrant.platform_handles as Record<string, string>)
      : {}

  const rows: CampaignRegistrantFieldRow[] = []

  const push = (key: string, label: string, value: ReactNode) => {
    rows.push({ key, label, value: value ?? '—' })
  }

  push('roll_number', campaignFieldLabel('roll_number'), registrant.roll_number || '—')
  push('full_name', campaignFieldLabel('full_name'), registrant.full_name || '—')

  if (has('email')) push('email', campaignFieldLabel('email'), registrant.email || '—')
  if (has('phone')) push('phone', campaignFieldLabel('phone'), registrant.phone || '—')
  if (has('branch')) push('branch', campaignFieldLabel('branch'), registrant.branch || '—')
  if (has('batch') || has('academic_batch')) {
    push(
      'batch',
      has('batch') ? campaignFieldLabel('batch') : campaignFieldLabel('academic_batch'),
      displayAcademicBatch({
        academic_batch: registrant.academic_batch,
        batch: registrant.batch,
      }),
    )
  }
  if (has('section')) push('section', campaignFieldLabel('section'), registrant.section || '—')
  if (has('date_of_birth')) {
    push(
      'date_of_birth',
      campaignFieldLabel('date_of_birth'),
      registrant.date_of_birth ? new Date(registrant.date_of_birth).toLocaleDateString() : '—',
    )
  }
  if (has('cgpa')) push('cgpa', campaignFieldLabel('cgpa'), registrant.cgpa ?? '—')
  if (has('active_backlogs')) {
    push('active_backlogs', campaignFieldLabel('active_backlogs'), registrant.active_backlogs ?? '—')
  }
  if (has('linkedin_url')) {
    push('linkedin_url', campaignFieldLabel('linkedin_url'), linkValue(registrant.linkedin_url))
  }
  if (has('github_url')) {
    push('github_url', campaignFieldLabel('github_url'), linkValue(registrant.github_url))
  }
  if (has('portfolio_url')) {
    push('portfolio_url', campaignFieldLabel('portfolio_url'), linkValue(registrant.portfolio_url))
  }
  if (has('skills_summary')) {
    push('skills_summary', campaignFieldLabel('skills_summary'), (
      <span className="whitespace-pre-wrap">{registrant.skills_summary?.trim() || '—'}</span>
    ))
  }
  if (has('career_interest')) {
    push('career_interest', campaignFieldLabel('career_interest'), registrant.career_interest || '—')
  }
  if (has('projects_summary')) {
    push('projects_summary', campaignFieldLabel('projects_summary'), (
      <span className="whitespace-pre-wrap">{registrant.projects_summary?.trim() || '—'}</span>
    ))
  }
  if (has('certifications_summary')) {
    const links = certificationLinksFromSummary(registrant.certifications_summary)
    push(
      'certifications_summary',
      campaignFieldLabel('certifications_summary'),
      links.length ? (
        <ul className="space-y-1">
          {links.map((url) => (
            <li key={url}>{linkValue(url)}</li>
          ))}
        </ul>
      ) : (
        '—'
      ),
    )
  }

  if (has('platform_handles')) {
    for (const platform of ALL_PLATFORMS) {
      const handle = handles[platform]?.trim()
      if (handle) {
        push(
          `platform_handles.${platform}`,
          campaignFieldLabel(`platform_handles.${platform}`),
          <span className="font-mono">@{handle}</span>,
        )
      }
    }
  } else {
    for (const platform of ALL_PLATFORMS) {
      if (!has(`platform_handles.${platform}`)) continue
      const handle = handles[platform]?.trim()
      push(
        `platform_handles.${platform}`,
        campaignFieldLabel(`platform_handles.${platform}`),
        handle ? <span className="font-mono">@{handle}</span> : '—',
      )
    }
  }

  if (has('resume')) {
    push(
      'resume',
      campaignFieldLabel('resume'),
      resumeUploaded == null ? '—' : resumeUploaded ? 'Uploaded' : 'Not uploaded',
    )
  }

  return rows
}
