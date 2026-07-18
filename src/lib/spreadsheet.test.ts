import { describe, expect, it } from 'vitest'
import { Workbook } from 'exceljs'
import { readSpreadsheetRows } from '@/lib/spreadsheet'

describe('spreadsheet reader', () => {
  it('reads XLSX rows without losing empty cells', async () => {
    const workbook = new Workbook()
    const sheet = workbook.addWorksheet('Students')
    sheet.addRow(['Roll Number', 'Name', 'Score'])
    sheet.addRow(['23CS001', 'Anita', 87])
    sheet.addRow(['23CS002', '', 72])
    const bytes = await workbook.xlsx.writeBuffer()
    const buffer = (bytes as unknown as Uint8Array).slice().buffer

    await expect(readSpreadsheetRows(buffer)).resolves.toEqual([
      ['Roll Number', 'Name', 'Score'],
      ['23CS001', 'Anita', 87],
      ['23CS002', '', 72],
    ])
  })
})

