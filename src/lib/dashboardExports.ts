import { jsPDF } from 'jspdf'
import type { DashboardSnapshot } from '@/api/placement/premiumDashboard'
import { COLLEGE_NAME, TNP_CELL } from '@/lib/brand'
import { downloadSpreadsheet } from '@/lib/spreadsheet'

function safeBatch(batch: string) {
  return batch === 'all' ? 'all_batches' : batch.replace(/[^\w-]/g, '_')
}

export function exportDashboardPdf(snapshot: DashboardSnapshot) {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
  let y = 18
  const line = (label: string, value: string | number) => {
    pdf.setFont('helvetica', 'bold')
    pdf.text(label, 18, y)
    pdf.setFont('helvetica', 'normal')
    pdf.text(String(value), 85, y)
    y += 7
  }
  const heading = (title: string) => {
    if (y > 265) {
      pdf.addPage()
      y = 18
    }
    y += 4
    pdf.setFillColor(210, 121, 24)
    pdf.rect(16, y - 5, 178, 9, 'F')
    pdf.setTextColor(255, 255, 255)
    pdf.setFont('helvetica', 'bold')
    pdf.text(title, 19, y + 1)
    pdf.setTextColor(30, 35, 41)
    y += 10
  }

  pdf.setFillColor(30, 35, 41)
  pdf.rect(0, 0, 210, 34, 'F')
  pdf.setTextColor(255, 255, 255)
  pdf.setFontSize(16)
  pdf.setFont('helvetica', 'bold')
  pdf.text('Placement Dashboard Report', 16, 14)
  pdf.setFontSize(9)
  pdf.setFont('helvetica', 'normal')
  pdf.text(`${COLLEGE_NAME} · ${TNP_CELL}`, 16, 21)
  pdf.text(`Batch: ${snapshot.batch === 'all' ? 'All batches' : snapshot.batch}`, 16, 27)
  pdf.setTextColor(30, 35, 41)
  y = 44

  heading('Overview')
  line('Total students', snapshot.overview.totalStudents)
  line('Readiness above 60%', snapshot.overview.above60)
  line('Readiness above 70%', snapshot.overview.above70)
  line('Readiness above 80%', snapshot.overview.above80)
  line('Placed students', snapshot.overview.placed)
  line('Unplaced students', snapshot.overview.unplaced)
  line('Placement percentage', `${snapshot.overview.placementPercentage}%`)

  heading('Management')
  line('Company links shared', snapshot.management.companyLinks)
  line('On-campus companies', snapshot.management.onCampusCompanies)
  line('Upcoming drives', snapshot.management.upcomingDrives)
  line('Active companies', snapshot.management.activeCompanies)

  heading('Readiness')
  snapshot.techReadiness.forEach((row) =>
    line(`${row.name} readiness`, `${row.score}% (${row.students} students)`),
  )
  line('Communication score', `${snapshot.communication.score}%`)
  line('Interview confidence', `${snapshot.communication.confidence}%`)
  line('Presentation skills', `${snapshot.communication.presentation}%`)
  line('Group discussion', `${snapshot.communication.groupDiscussion}%`)
  line('HR readiness', `${snapshot.communication.hrReadiness}%`)
  line('Overall readiness', `${snapshot.overall.score}%`)

  heading('Readiness insight')
  pdf.setFont('helvetica', 'normal')
  const recommendation = pdf.splitTextToSize(snapshot.overall.recommendation, 170)
  pdf.text(recommendation, 18, y)
  y += recommendation.length * 5 + 5

  pdf.setFontSize(8)
  pdf.setTextColor(100, 108, 119)
  pdf.text(`Generated ${new Date(snapshot.refreshedAt).toLocaleString()}`, 16, 288)
  pdf.save(`placement_dashboard_${safeBatch(snapshot.batch)}.pdf`)
}

export async function exportDashboardXlsx(snapshot: DashboardSnapshot) {
  const overview = [
    ['Metric', 'Value'],
    ['Batch', snapshot.batch === 'all' ? 'All batches' : snapshot.batch],
    ['Total Students', snapshot.overview.totalStudents],
    ['Above 60%', snapshot.overview.above60],
    ['Above 70%', snapshot.overview.above70],
    ['Above 80%', snapshot.overview.above80],
    ['Placed', snapshot.overview.placed],
    ['Unplaced', snapshot.overview.unplaced],
    ['Placement Percentage', snapshot.overview.placementPercentage],
    ['Company Links Shared', snapshot.management.companyLinks],
    ['On-Campus Companies', snapshot.management.onCampusCompanies],
    ['Upcoming Drives', snapshot.management.upcomingDrives],
  ]
  const readiness = [
    ['Area', 'Score', 'Students'],
    ...snapshot.techReadiness.map((row) => [row.name, row.score, row.students]),
    ['Communication', snapshot.communication.score, ''],
    ['Interview Confidence', snapshot.communication.confidence, ''],
    ['Presentation', snapshot.communication.presentation, ''],
    ['Group Discussion', snapshot.communication.groupDiscussion, ''],
    ['HR Readiness', snapshot.communication.hrReadiness, ''],
    ['Overall', snapshot.overall.score, ''],
  ]
  const events = [
    ['Title', 'Type', 'Mode', 'Starts At', 'Venue', 'Status'],
    ...snapshot.upcomingEvents.map((event) => [
      event.title,
      event.event_type,
      event.mode,
      event.starts_at,
      event.venue,
      event.status,
    ]),
  ]
  await downloadSpreadsheet(
    `placement_dashboard_${safeBatch(snapshot.batch)}.xlsx`,
    [
      { name: 'Overview', rows: overview },
      { name: 'Readiness', rows: readiness },
      { name: 'Upcoming Drives', rows: events },
    ],
  )
}

