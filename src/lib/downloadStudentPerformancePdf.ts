import { jsPDF } from 'jspdf'
import type { PublicStudentPerformance } from '@/api/placement/studentShare'
import { COLLEGE_NAME, TNP_CELL } from '@/lib/brand'
import {
  classifyCommunicationBadge,
  formatCommunicationBadge,
} from '@/lib/communicationBadge'
import { COMMUNICATION_SECTIONS } from '@/lib/communicationEvaluation'
import { CODENOW_CATEGORY_LABELS, type CodeNowCategory } from '@/lib/codeNowCategories'
import {
  blendCodingPercent,
  buildOverallPerformanceSummary,
  codingPercentFromSolved,
  githubPercentFromActivity,
} from '@/lib/overallPerformance'
import { resolvePlatformHandles, platformHandlesToUsernames } from '@/lib/studentPlatformHandles'
import type { StudentProfileRow } from '@/api/placement/students'
import { splitAccounts } from '@/lib/utils'
import type { Platform } from '@/types/api'

const MARGIN = 16
const PAGE_W = 210
const PAGE_H = 297
const CONTENT_W = PAGE_W - MARGIN * 2
const FOOTER_Y = PAGE_H - 12

const COLORS = {
  text: [30, 35, 41] as [number, number, number],
  muted: [100, 108, 119] as [number, number, number],
  line: [200, 205, 212] as [number, number, number],
  brand: [210, 121, 24] as [number, number, number],
  headerBg: [30, 35, 41] as [number, number, number],
  sectionBg: [245, 246, 248] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
}

function safeFilePart(value: string) {
  return value.replace(/[^\w.-]+/g, '_').slice(0, 80)
}

function display(value: unknown, suffix = '') {
  if (value == null || value === '') return 'Not Available'
  return `${value}${suffix}`
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Not Available'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return 'Not Available'
  return d.toLocaleDateString()
}

/** Text-based student performance report (real PDF document, not a screenshot). */
class StudentPerformanceReport {
  private pdf: jsPDF
  private y = MARGIN
  private pageStart = 1
  private page = 1
  private ownsDocument: boolean
  private profile: PublicStudentPerformance

  constructor(profile: PublicStudentPerformance, existingPdf?: jsPDF) {
    this.profile = profile
    if (existingPdf) {
      this.pdf = existingPdf
      this.ownsDocument = false
      this.pageStart = existingPdf.getNumberOfPages()
      this.page = this.pageStart
    } else {
      this.pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true })
      this.ownsDocument = true
      this.pdf.setProperties({
        title: `${profile.fullName} — Student Performance Report`,
        subject: 'Student performance profile report',
        creator: 'CodeTrace Placement',
      })
    }
  }

  private localPage() {
    return this.page - this.pageStart + 1
  }

  private ensureSpace(neededMm: number) {
    if (this.y + neededMm <= FOOTER_Y - 4) return
    this.addPage()
  }

  private addPage() {
    this.drawFooter()
    this.pdf.addPage()
    this.page = this.pdf.getNumberOfPages()
    this.y = MARGIN
    this.drawContinuationHeader()
  }

  private drawContinuationHeader() {
    this.pdf.setFillColor(...COLORS.brand)
    this.pdf.rect(0, 0, PAGE_W, 3, 'F')
    this.pdf.setFont('helvetica', 'normal')
    this.pdf.setFontSize(8)
    this.pdf.setTextColor(...COLORS.muted)
    this.pdf.text(`${this.profile.fullName} · ${this.profile.rollNumber}`, MARGIN, 10)
    this.y = 16
  }

  private drawFooter() {
    this.pdf.setDrawColor(...COLORS.line)
    this.pdf.setLineWidth(0.2)
    this.pdf.line(MARGIN, FOOTER_Y - 4, PAGE_W - MARGIN, FOOTER_Y - 4)
    this.pdf.setFont('helvetica', 'normal')
    this.pdf.setFontSize(8)
    this.pdf.setTextColor(...COLORS.muted)
    this.pdf.text(`${COLLEGE_NAME} · ${TNP_CELL}`, MARGIN, FOOTER_Y)
    this.pdf.text(`Page ${this.localPage()}`, PAGE_W - MARGIN, FOOTER_Y, { align: 'right' })
  }

  private sectionTitle(number: string, title: string, description?: string) {
    this.ensureSpace(18)
    this.pdf.setFillColor(...COLORS.sectionBg)
    this.pdf.roundedRect(MARGIN, this.y, CONTENT_W, description ? 14 : 10, 1.5, 1.5, 'F')
    this.pdf.setFillColor(...COLORS.brand)
    this.pdf.roundedRect(MARGIN + 2, this.y + 2.5, 12, 5, 1, 1, 'F')
    this.pdf.setFont('helvetica', 'bold')
    this.pdf.setFontSize(8)
    this.pdf.setTextColor(...COLORS.white)
    this.pdf.text(`#${number}`, MARGIN + 8, this.y + 6, { align: 'center' })
    this.pdf.setTextColor(...COLORS.text)
    this.pdf.setFontSize(11)
    this.pdf.text(title, MARGIN + 17, this.y + 6)
    if (description) {
      this.pdf.setFont('helvetica', 'normal')
      this.pdf.setFontSize(8)
      this.pdf.setTextColor(...COLORS.muted)
      this.pdf.text(description, MARGIN + 17, this.y + 11)
      this.y += 18
    } else {
      this.y += 14
    }
  }

  private kvGrid(rows: Array<[string, string]>, cols = 2) {
    const gap = 3
    const colW = (CONTENT_W - gap * (cols - 1)) / cols
    const rowH = 12

    for (let i = 0; i < rows.length; i += cols) {
      this.ensureSpace(rowH + 2)
      for (let c = 0; c < cols; c += 1) {
        const item = rows[i + c]
        if (!item) continue
        const x = MARGIN + c * (colW + gap)
        this.pdf.setDrawColor(...COLORS.line)
        this.pdf.setLineWidth(0.2)
        this.pdf.roundedRect(x, this.y, colW, rowH, 1, 1, 'S')
        this.pdf.setFont('helvetica', 'normal')
        this.pdf.setFontSize(7)
        this.pdf.setTextColor(...COLORS.muted)
        this.pdf.text(item[0].toUpperCase(), x + 2.5, this.y + 4)
        this.pdf.setFont('helvetica', 'bold')
        this.pdf.setFontSize(9)
        this.pdf.setTextColor(...COLORS.text)
        const valueLines = this.pdf.splitTextToSize(String(item[1]), colW - 5)
        this.pdf.text(valueLines[0] ?? '—', x + 2.5, this.y + 9)
      }
      this.y += rowH + 2
    }
  }

  private paragraph(text: string) {
    this.pdf.setFont('helvetica', 'normal')
    this.pdf.setFontSize(9)
    this.pdf.setTextColor(...COLORS.text)
    const lines = this.pdf.splitTextToSize(text, CONTENT_W)
    for (const line of lines) {
      this.ensureSpace(5)
      this.pdf.text(line, MARGIN, this.y)
      this.y += 4.5
    }
  }

  private mutedLine(text: string) {
    this.ensureSpace(5)
    this.pdf.setFont('helvetica', 'normal')
    this.pdf.setFontSize(8)
    this.pdf.setTextColor(...COLORS.muted)
    this.pdf.text(text, MARGIN, this.y)
    this.y += 5
  }

  private drawHeader() {
    // For bulk append on an existing page that already has content, start fresh page first.
    if (!this.ownsDocument && this.pdf.getNumberOfPages() >= 1 && this.y > MARGIN + 1) {
      // first student on new shared doc starts at top; subsequent students call addPage before construct
    }

    this.pdf.setFillColor(...COLORS.headerBg)
    this.pdf.rect(0, 0, PAGE_W, 42, 'F')
    this.pdf.setFillColor(...COLORS.brand)
    this.pdf.rect(0, 42, PAGE_W, 2, 'F')

    this.pdf.setFont('helvetica', 'bold')
    this.pdf.setFontSize(9)
    this.pdf.setTextColor(...COLORS.brand)
    this.pdf.text('STUDENT PERFORMANCE REPORT', MARGIN, 12)

    this.pdf.setFont('helvetica', 'normal')
    this.pdf.setFontSize(8)
    this.pdf.setTextColor(180, 186, 194)
    this.pdf.text(COLLEGE_NAME, MARGIN, 18)
    this.pdf.text(TNP_CELL, MARGIN, 23)

    this.pdf.setFont('helvetica', 'bold')
    this.pdf.setFontSize(16)
    this.pdf.setTextColor(...COLORS.white)
    this.pdf.text(this.profile.fullName || 'Student', MARGIN, 33)

    this.pdf.setFont('helvetica', 'normal')
    this.pdf.setFontSize(9)
    this.pdf.setTextColor(200, 205, 212)
    this.pdf.text(
      [
        this.profile.rollNumber,
        this.profile.branch || '—',
        this.profile.batch || this.profile.graduationYear || '—',
      ].join('  ·  '),
      MARGIN,
      39,
    )

    this.y = 52
  }

  build() {
    const profile = this.profile
    const usernames = platformHandlesToUsernames(
      resolvePlatformHandles({
        github_url: profile.githubUrl || '',
        platform_handles: profile.platformHandles,
      } as Pick<StudentProfileRow, 'github_url' | 'platform_handles'>),
    )
    const githubUsername = usernames.github?.trim() || null
    const githubUrl =
      profile.githubUrl || (githubUsername ? `https://github.com/${githubUsername}` : null)
    const codingAccounts = (Object.entries(usernames) as [Platform, string][])
      .filter(([platform]) => platform !== 'github')
      .flatMap(([platform, value]) =>
        splitAccounts(value).map((username) => ({ platform, username })),
      )
    const githubCard = profile.cards.find((c) => c.platform === 'github')
    const overall = buildOverallPerformanceSummary({
      codingPercent: blendCodingPercent(
        codingPercentFromSolved(profile.totalSolved),
        profile.codeNow?.percentage ?? null,
      ),
      githubPercent: githubPercentFromActivity({
        commits: githubCard?.stats.totalSolved ?? null,
        stars: githubCard?.rating?.current ?? githubCard?.contests?.rating ?? null,
      }),
      communicationPercent: profile.communication?.percentage ?? null,
      aptitudePercent: profile.aptitude?.percentage ?? null,
      verbalPercent: profile.verbal?.percentage ?? null,
    })

    this.drawHeader()

    this.kvGrid(
      [
        ['Readiness score', String(profile.readinessScore)],
        ['Readiness status', profile.readinessStatus.replace(/_/g, ' ')],
        ['CGPA', display(profile.cgpa)],
        ['Placement status', profile.placementStatus.replace(/_/g, ' ')],
        ['Problems solved', String(profile.totalSolved)],
        [
          'Overall %',
          overall.overallPercent != null
            ? `${overall.overallPercent}% · ${overall.overallStatus}`
            : 'Not Available',
        ],
      ],
      3,
    )
    this.y += 2

    this.sectionTitle('01', 'Student Identity', 'Core identity details')
    this.kvGrid(
      [
        ['Full name', profile.fullName],
        ['Roll number', profile.rollNumber],
        ['Department', display(profile.branch)],
        ['Academic batch', display(profile.batch)],
        ['Graduation year', display(profile.graduationYear)],
        ['Headline / interest', display(profile.headline || profile.careerInterest)],
        ['Skills summary', display(profile.skillsSummary)],
        ['Career interest', display(profile.careerInterest)],
      ],
      2,
    )

    this.sectionTitle('02', 'Coding Platform Performance', 'Cached coding snapshot')
    if (profile.codingSyncedAt) {
      this.mutedLine(`Snapshot synced: ${formatDate(profile.codingSyncedAt)}`)
    }
    if (codingAccounts.length) {
      this.kvGrid(
        codingAccounts.map(({ platform, username }) => {
          const card = profile.cards.find((c) => c.platform === platform)
          const hint =
            card?.stats.totalSolved != null ? ` · ${card.stats.totalSolved} solved` : ''
          return [platform, `@${username}${hint}`]
        }),
        2,
      )
    } else {
      this.mutedLine('Not Available — no coding platform accounts linked.')
    }

    this.y += 1
    this.mutedLine('CodeNow')
    if (profile.codeNow) {
      this.kvGrid(
        [
          [
            'Score',
            profile.codeNow.totalScore != null && profile.codeNow.maxScore != null
              ? `${profile.codeNow.totalScore}/${profile.codeNow.maxScore}`
              : 'Not Available',
          ],
          ['Percentage', display(profile.codeNow.percentage, '%')],
          ['Grade', display(profile.codeNow.grade)],
          [
            'Challenges',
            profile.codeNow.solvedChallenges != null && profile.codeNow.totalChallenges != null
              ? `${profile.codeNow.solvedChallenges}/${profile.codeNow.totalChallenges}`
              : display(profile.codeNow.totalChallenges),
          ],
          ['Username', display(profile.codeNow.username)],
          ['Last synced', formatDate(profile.codeNow.lastSyncedAt)],
          ...Object.entries(profile.codeNow.categorySummary || {}).map(
            ([key, value]) =>
              [
                CODENOW_CATEGORY_LABELS[key as CodeNowCategory] || key,
                `${value}%`,
              ] as [string, string],
          ),
        ],
        3,
      )
    } else {
      this.mutedLine('CodeNow: Not Available')
    }

    this.sectionTitle('03', 'GitHub Activity', 'Public repositories and activity')
    if (githubUsername || githubUrl) {
      this.kvGrid(
        [
          ['GitHub username', display(githubUsername ? `@${githubUsername}` : null)],
          ['Profile link', display(githubUrl)],
          ['Activity (cached)', display(githubCard?.stats.totalSolved)],
          [
            'Stars / rating',
            display(githubCard?.rating?.current ?? githubCard?.contests?.rating),
          ],
        ],
        2,
      )
    } else {
      this.mutedLine('Not Available')
    }

    this.sectionTitle('04', 'Communication Evaluation', '250-mark structured assessment')
    if (profile.communication) {
      this.kvGrid(
        [
          [
            'Communication score',
            `${profile.communication.totalScore}/${profile.communication.maxScore}`,
          ],
          ['Percentage', `${profile.communication.percentage}%`],
          ['Grade', profile.communication.grade],
          [
            'Badge',
            formatCommunicationBadge(
              classifyCommunicationBadge(profile.communication.totalScore),
            ),
          ],
          ['Proficiency', `${profile.communication.proficiencyTotal}/80`],
          ['Presentation', `${profile.communication.presentationTotal}/60`],
          ['Behavioural', `${profile.communication.behaviouralTotal}/110`],
          ['Last evaluated', formatDate(profile.communication.evaluatedAt)],
        ],
        2,
      )

      if (profile.communication.criteria) {
        this.y += 1
        this.mutedLine('25-parameter breakdown')
        for (const section of COMMUNICATION_SECTIONS) {
          this.ensureSpace(8)
          this.pdf.setFont('helvetica', 'bold')
          this.pdf.setFontSize(9)
          this.pdf.setTextColor(...COLORS.text)
          this.pdf.text(`${section.title} (/${section.maxTotal})`, MARGIN, this.y)
          this.y += 5
          this.kvGrid(
            section.fields.map((field, idx) => {
              const offset =
                section.id === 'presentation' ? 8 : section.id === 'behavioural' ? 14 : 0
              return [
                `${idx + 1 + offset}. ${field.label}`,
                `${profile.communication?.criteria?.[field.key] ?? '—'}/10`,
              ]
            }),
            2,
          )
        }
      }
    } else {
      this.mutedLine('Not Available')
    }

    this.sectionTitle('05', 'Aptitude Performance')
    if (profile.aptitude) {
      this.kvGrid(
        [
          [
            'Score',
            profile.aptitude.score != null && profile.aptitude.maxScore != null
              ? `${profile.aptitude.score}/${profile.aptitude.maxScore}`
              : 'Not Available',
          ],
          ['Percentage', display(profile.aptitude.percentage, '%')],
          ['Grade / status', display(profile.aptitude.grade)],
          ['Test name', display(profile.aptitude.testName)],
          ['Last updated', formatDate(profile.aptitude.evaluatedAt)],
        ],
        2,
      )
    } else {
      this.mutedLine('Not Available')
    }

    this.sectionTitle('06', 'Verbal Performance')
    if (profile.verbal) {
      this.kvGrid(
        [
          [
            'Score',
            profile.verbal.score != null && profile.verbal.maxScore != null
              ? `${profile.verbal.score}/${profile.verbal.maxScore}`
              : 'Not Available',
          ],
          ['Percentage', display(profile.verbal.percentage, '%')],
          ['Grade / status', display(profile.verbal.grade)],
          ['Test name', display(profile.verbal.testName)],
          ['Last updated', formatDate(profile.verbal.evaluatedAt)],
        ],
        2,
      )
    } else {
      this.mutedLine('Not Available')
    }

    this.sectionTitle(
      '07',
      'Overall Performance Summary',
      'Display-only composite (does not change placement readiness)',
    )
    this.kvGrid(
      [
        ['Coding score', display(overall.codingPercent, '%')],
        ['GitHub score', display(overall.githubPercent, '%')],
        ['Communication %', display(overall.communicationPercent, '%')],
        ['Aptitude %', display(overall.aptitudePercent, '%')],
        ['Verbal %', display(overall.verbalPercent, '%')],
        [
          'Overall %',
          overall.overallPercent != null
            ? `${overall.overallPercent}% · ${overall.overallStatus}`
            : 'Not Available',
        ],
      ],
      2,
    )
    this.y += 2
    this.mutedLine('Strengths')
    this.paragraph(overall.strengths.length ? overall.strengths.join(' · ') : 'Not Available')
    this.y += 1
    this.mutedLine('Improvement areas')
    this.paragraph(
      overall.improvementAreas.length ? overall.improvementAreas.join(' · ') : 'Not Available',
    )
    if (overall.missingComponents.length) {
      this.y += 1
      this.mutedLine(
        `Missing components (excluded from overall): ${overall.missingComponents.join(', ')}`,
      )
    }

    this.y += 4
    this.mutedLine(
      `Generated ${formatDate(profile.generatedAt || new Date().toISOString())} · CodeTrace placement report`,
    )

    this.drawFooter()
    return this.pdf
  }
}

export async function downloadStudentPerformancePdf(
  profile: PublicStudentPerformance,
  filename?: string,
) {
  const pdf = new StudentPerformanceReport(profile).build()
  const name =
    filename ||
    `${safeFilePart(profile.rollNumber || 'student')}_${safeFilePart(profile.fullName || 'profile')}_performance_report.pdf`
  pdf.save(name)
}

export async function downloadStudentPerformancePdfBundle(
  profiles: PublicStudentPerformance[],
  filename = 'filtered_students_performance_reports.pdf',
  onProgress?: (done: number, total: number) => void,
) {
  if (!profiles.length) throw new Error('No students to export')

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true })
  pdf.setProperties({
    title: 'Student Performance Reports',
    subject: 'Bulk filtered student performance reports',
    creator: 'CodeTrace Placement',
  })

  for (let i = 0; i < profiles.length; i += 1) {
    if (i > 0) pdf.addPage()
    new StudentPerformanceReport(profiles[i]!, pdf).build()
    onProgress?.(i + 1, profiles.length)
  }

  pdf.save(filename)
}
