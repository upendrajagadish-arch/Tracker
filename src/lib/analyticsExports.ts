import { jsPDF } from 'jspdf'
import { COLLEGE_NAME, TNP_CELL } from '@/lib/brand'
import { downloadSpreadsheet } from '@/lib/spreadsheet'

export type ExportCellValue = string | number | boolean | Date | null | undefined

export interface SectionExportTable {
  title: string
  description?: string
  fileBase: string
  sheetName?: string
  columns: string[]
  /** Display rows (already formatted for UI/PDF text). */
  rows: string[][]
  /** Optional typed Excel values aligned to columns; falls back to display rows. */
  excelRows?: ExportCellValue[][]
}

const RESERVED_NAMES = new Set([
  'CON',
  'PRN',
  'AUX',
  'NUL',
  'COM1',
  'COM2',
  'COM3',
  'COM4',
  'LPT1',
  'LPT2',
  'LPT3',
])

export function sanitizeSpreadsheetText(value: string): string {
  const cleaned = value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').slice(0, 32767)
  if (/^[=+\-@]/.test(cleaned)) return `'${cleaned}`
  return cleaned
}

export function sanitizeDownloadName(value: string, extension: 'xlsx' | 'pdf'): string {
  let base = value
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001F]+/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^[.\s]+|[.\s]+$/g, '')
    .slice(0, 80)
  if (!base) base = 'export'
  if (RESERVED_NAMES.has(base.toUpperCase())) base = `${base}_export`
  return `${base}.${extension}`
}

export function sanitizeSheetName(value: string, used = new Set<string>()): string {
  let name = value.replace(/[[\]:*?/\\]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 31) || 'Sheet'
  let candidate = name
  let counter = 2
  while (used.has(candidate.toLowerCase())) {
    const suffix = ` (${counter})`
    candidate = `${name.slice(0, Math.max(1, 31 - suffix.length))}${suffix}`
    counter += 1
  }
  used.add(candidate.toLowerCase())
  return candidate
}

function excelCell(value: ExportCellValue): string | number | boolean {
  if (value == null) return ''
  if (typeof value === 'number') return Number.isFinite(value) ? value : ''
  if (typeof value === 'boolean') return value
  if (value instanceof Date) return value.toISOString()
  return sanitizeSpreadsheetText(String(value))
}

function toExcelMatrix(section: SectionExportTable): Array<Array<string | number | boolean>> {
  const body =
    section.excelRows?.map((row) => row.map(excelCell)) ??
    section.rows.map((row) => row.map((cell) => sanitizeSpreadsheetText(String(cell ?? ''))))
  return [section.columns.map((header) => sanitizeSpreadsheetText(header)), ...body]
}

/** Build a typed section export from display columns/rows (common for detail modals). */
export function tableSectionExport(
  title: string,
  columns: string[],
  rows: string[][],
  options?: { description?: string; fileBase?: string; sheetName?: string },
): SectionExportTable {
  return {
    title,
    description: options?.description,
    fileBase: options?.fileBase ?? title,
    sheetName: options?.sheetName ?? title,
    columns,
    rows,
  }
}

export async function exportSectionXlsx(section: SectionExportTable): Promise<void> {
  const used = new Set<string>()
  await downloadSpreadsheet(sanitizeDownloadName(section.fileBase, 'xlsx'), [
    {
      name: sanitizeSheetName(section.sheetName ?? section.title, used),
      rows: toExcelMatrix(section),
    },
  ])
}

export async function exportSectionPdf(section: SectionExportTable): Promise<void> {
  const columnCount = Math.max(1, section.columns.length)
  const landscape = columnCount > 5
  const pdf = new jsPDF({
    orientation: landscape ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  })
  pdf.setProperties({
    title: section.title,
    subject: section.description ?? 'Placement analytics export',
    creator: 'CodeTrace Placement',
  })

  const pageW = pdf.internal.pageSize.getWidth()
  const pageH = pdf.internal.pageSize.getHeight()
  const margin = 12
  const contentW = pageW - margin * 2
  const footerY = pageH - 8
  const colW = contentW / columnCount
  let y = margin
  let page = 1

  const drawHeader = (continuation = false) => {
    pdf.setFillColor(30, 35, 41)
    pdf.rect(0, 0, pageW, continuation ? 16 : 28, 'F')
    pdf.setTextColor(255, 255, 255)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(continuation ? 11 : 14)
    pdf.text(section.title.slice(0, 90), margin, continuation ? 10 : 12)
    if (!continuation) {
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(8)
      pdf.text(`${COLLEGE_NAME} · ${TNP_CELL}`, margin, 19)
      if (section.description) {
        const lines = pdf.splitTextToSize(section.description, contentW)
        pdf.text(lines.slice(0, 1), margin, 24)
      }
    }
    pdf.setTextColor(30, 35, 41)
    y = continuation ? 22 : 36
  }

  const drawFooter = () => {
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(7)
    pdf.setTextColor(100, 108, 119)
    pdf.text(`Generated ${new Date().toLocaleString()}`, margin, footerY)
    pdf.text(`Page ${page}`, pageW - margin, footerY, { align: 'right' })
    pdf.setTextColor(30, 35, 41)
  }

  const ensureSpace = (needed: number) => {
    if (y + needed <= footerY - 4) return
    drawFooter()
    pdf.addPage()
    page += 1
    drawHeader(true)
    drawColumnHeaders()
  }

  const drawColumnHeaders = () => {
    pdf.setFillColor(210, 121, 24)
    pdf.rect(margin, y, contentW, 8, 'F')
    pdf.setTextColor(255, 255, 255)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(7.5)
    section.columns.forEach((column, index) => {
      const text = pdf.splitTextToSize(column, colW - 2)
      pdf.text(text[0] ?? '', margin + index * colW + 1, y + 5.2)
    })
    pdf.setTextColor(30, 35, 41)
    y += 10
  }

  drawHeader(false)
  drawColumnHeaders()

  if (!section.rows.length) {
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(10)
    pdf.text('No matching records.', margin, y + 4)
  } else {
    section.rows.forEach((row, rowIndex) => {
      const wrapped = section.columns.map((_, index) => {
        const cell = String(row[index] ?? '—')
        return pdf.splitTextToSize(cell, colW - 2) as string[]
      })
      const lineCount = Math.max(1, ...wrapped.map((lines) => lines.length))
      const rowH = Math.max(7, lineCount * 4 + 2)
      ensureSpace(rowH)
      if (rowIndex % 2 === 0) {
        pdf.setFillColor(248, 249, 250)
        pdf.rect(margin, y - 1, contentW, rowH, 'F')
      }
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(7.5)
      wrapped.forEach((lines, index) => {
        pdf.text(lines, margin + index * colW + 1, y + 3.5)
      })
      y += rowH
    })
  }

  drawFooter()
  pdf.save(sanitizeDownloadName(section.fileBase, 'pdf'))
}

/** Convenience helper for simple name/value chart data. */
export function chartDataSectionExport(
  title: string,
  data: Array<{ name: string; value: number }>,
): SectionExportTable {
  return {
    title,
    fileBase: title,
    sheetName: title,
    columns: ['Name', 'Value'],
    rows: data.map((row) => [row.name, String(row.value)]),
    excelRows: data.map((row) => [row.name, row.value]),
  }
}
