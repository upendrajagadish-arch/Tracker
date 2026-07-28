import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  parseCertificationLinks,
  serializeCertificationLinks,
} from '@/lib/certificationsSummary'

export function CertificationsListField({
  value,
  onChange,
  className,
  label = 'Certification links',
  hint = 'Add certificate or credential URLs. Use + to add another link.',
}: {
  value: string
  onChange: (value: string) => void
  className?: string
  label?: string
  hint?: string
}) {
  const rows = parseCertificationLinks(value)

  const updateRows = (next: string[]) => {
    onChange(serializeCertificationLinks(next))
  }

  const setRow = (index: number, nextValue: string) => {
    const next = [...rows]
    next[index] = nextValue
    updateRows(next)
  }

  const addRow = () => {
    updateRows([...rows, ''])
  }

  const removeRow = (index: number) => {
    const next = rows.filter((_, i) => i !== index)
    updateRows(next.length ? next : [''])
  }

  return (
    <div className={className}>
      <span className="text-muted-foreground">{label}</span>
      <div className="mt-2 space-y-2">
        {rows.map((row, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input
              type="url"
              className="border-border bg-card"
              placeholder="https://example.com/certificate/123"
              value={row}
              onChange={(e) => setRow(index, e.target.value)}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Remove certification link"
              disabled={rows.length <= 1 && !row.trim()}
              onClick={() => removeRow(index)}
            >
              <X className="size-4" />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={addRow}>
          <Plus className="size-3.5" />
          Add certification
        </Button>
      </div>
      {hint ? <span className="mt-1 block text-xs text-muted-foreground">{hint}</span> : null}
    </div>
  )
}
