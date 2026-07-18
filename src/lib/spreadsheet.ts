async function createWorkbook() {
  const { Workbook } = await import('exceljs')
  return new Workbook()
}

function cellText(value: unknown): string | number | boolean {
  if (value == null) return ''
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value
  }
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'object') {
    const cell = value as {
      result?: unknown
      text?: unknown
      hyperlink?: unknown
      richText?: Array<{ text?: string }>
    }
    if (cell.result != null) return cellText(cell.result)
    if (cell.text != null) return String(cell.text)
    if (cell.richText) return cell.richText.map((part) => part.text ?? '').join('')
    if (cell.hyperlink != null) return String(cell.hyperlink)
  }
  return String(value)
}

export async function readSpreadsheetRows(buffer: ArrayBuffer): Promise<unknown[][]> {
  const workbook = await createWorkbook()
  await workbook.xlsx.load(buffer)
  const worksheet = workbook.worksheets[0]
  if (!worksheet) return []

  const rows: unknown[][] = []
  worksheet.eachRow({ includeEmpty: true }, (row) => {
    const values = row.values as unknown[]
    const width = Math.max(worksheet.columnCount, values.length - 1)
    rows.push(Array.from({ length: width }, (_, index) => cellText(values[index + 1])))
  })
  return rows
}

export async function downloadSpreadsheet(
  fileName: string,
  sheets: Array<{ name: string; rows: Array<Array<string | number | boolean>> }>,
) {
  const workbook = await createWorkbook()
  workbook.creator = 'CodeTrace Placement Intelligence'
  workbook.created = new Date()

  for (const sheet of sheets) {
    const worksheet = workbook.addWorksheet(sheet.name.slice(0, 31))
    worksheet.addRows(sheet.rows)
    const header = worksheet.getRow(1)
    header.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    header.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD27918' },
    }
    worksheet.columns.forEach((column) => {
      let width = 12
      column.eachCell?.({ includeEmpty: false }, (cell) => {
        width = Math.min(50, Math.max(width, String(cell.value ?? '').length + 2))
      })
      column.width = width
    })
    worksheet.views = [{ state: 'frozen', ySplit: 1 }]
  }

  const bytes = await workbook.xlsx.writeBuffer()
  const blob = new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

