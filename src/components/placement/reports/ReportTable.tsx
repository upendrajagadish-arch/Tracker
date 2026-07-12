import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface ReportTableProps {
  columns?: string[]
  rows?: (string | number | null | undefined)[][]
}

export function ReportTable({ columns = [], rows = [] }: ReportTableProps) {
  if (!rows.length) {
    return <p className="text-sm text-muted-foreground">No data for this section.</p>
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30 hover:bg-muted/40">
            {columns.map((col) => (
              <TableHead key={col} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {col}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow key={i} className="hover:bg-muted/40">
              {row.map((cell, j) => (
                <TableCell key={j} className="max-w-xs truncate text-foreground" title={String(cell ?? '')}>
                  {cell ?? '—'}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
