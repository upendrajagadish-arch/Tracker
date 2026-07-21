import { useState } from 'react'
import { Download, FileSpreadsheet, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  exportSectionPdf,
  exportSectionXlsx,
  type SectionExportTable,
} from '@/lib/analyticsExports'
import { cn } from '@/lib/utils'

export function SectionExportActions({
  section,
  className,
  size = 'sm',
}: {
  section: SectionExportTable
  className?: string
  size?: 'sm' | 'xs'
}) {
  const [busy, setBusy] = useState<'xlsx' | 'pdf' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const run = async (kind: 'xlsx' | 'pdf') => {
    setBusy(kind)
    setError(null)
    try {
      if (kind === 'xlsx') await exportSectionXlsx(section)
      else await exportSectionPdf(section)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed')
    } finally {
      setBusy(null)
    }
  }

  const compact = size === 'xs'

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn(compact && 'h-7 px-2 text-[11px]')}
        disabled={busy != null}
        onClick={() => void run('xlsx')}
      >
        <FileSpreadsheet className={cn('size-3.5', compact && 'size-3')} />
        {busy === 'xlsx' ? 'Excel…' : 'Excel'}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn(compact && 'h-7 px-2 text-[11px]')}
        disabled={busy != null}
        onClick={() => void run('pdf')}
      >
        <FileText className={cn('size-3.5', compact && 'size-3')} />
        {busy === 'pdf' ? 'PDF…' : 'PDF'}
      </Button>
      {error ? (
        <span className="text-[10px] font-medium text-[#F6465D]" title={error}>
          <Download className="mr-1 inline size-3" />
          Failed
        </span>
      ) : null}
    </div>
  )
}
