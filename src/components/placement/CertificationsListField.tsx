import { useEffect, useId, useRef, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  parseCertificationLinks,
  serializeCertificationLinks,
} from '@/lib/certificationsSummary'

type CertRow = { key: string; url: string }

function toRows(summary: string, idPrefix: string): CertRow[] {
  return parseCertificationLinks(summary).map((url, index) => ({
    key: `${idPrefix}-${index}`,
    url,
  }))
}

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
  const uid = useId()
  const [rows, setRows] = useState<CertRow[]>(() => toRows(value, uid))
  const lastEmitted = useRef(value)

  // Sync when parent resets / loads a different value (not our own onChange echo).
  useEffect(() => {
    if (value === lastEmitted.current) return
    lastEmitted.current = value
    setRows(toRows(value, uid))
  }, [uid, value])

  const commit = (next: CertRow[]) => {
    setRows(next)
    const serialized = serializeCertificationLinks(next.map((row) => row.url))
    lastEmitted.current = serialized
    onChange(serialized)
  }

  const setRow = (index: number, nextValue: string) => {
    commit(rows.map((row, i) => (i === index ? { ...row, url: nextValue } : row)))
  }

  const addRow = () => {
    commit([...rows, { key: `${uid}-${Date.now()}`, url: '' }])
  }

  const removeRow = (index: number) => {
    const next = rows.filter((_, i) => i !== index)
    commit(next.length ? next : [{ key: `${uid}-empty`, url: '' }])
  }

  return (
    <div className={className}>
      <span className="text-muted-foreground">{label}</span>
      <div className="mt-2 space-y-2">
        {rows.map((row, index) => (
          <div key={row.key} className="flex items-center gap-2">
            <Input
              type="url"
              className="border-border bg-card"
              placeholder="https://example.com/certificate/123"
              value={row.url}
              onChange={(e) => setRow(index, e.target.value)}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Add another certification link"
              onClick={addRow}
            >
              <Plus className="size-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Remove certification link"
              disabled={rows.length <= 1 && !row.url.trim()}
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
