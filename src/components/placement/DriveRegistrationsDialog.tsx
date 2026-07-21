import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SectionExportActions } from '@/components/placement/SectionExportActions'
import {
  driveRegistrationsExportSection,
  listDriveRegistrations,
  type PlacementDriveRegistrationRow,
} from '@/api/placement/placementDriveRegistrations'

export function DriveRegistrationsDialog({
  open,
  onClose,
  placementEventId,
  companyName,
  driveTitle,
}: {
  open: boolean
  onClose: () => void
  placementEventId: string | null
  companyName: string
  driveTitle: string
}) {
  const [rows, setRows] = useState<PlacementDriveRegistrationRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !placementEventId) return
    let active = true
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await listDriveRegistrations(placementEventId)
        if (active) setRows(data)
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : 'Failed to load registrations')
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [open, placementEventId])

  const exportSection = useMemo(
    () => driveRegistrationsExportSection(companyName, driveTitle, rows),
    [companyName, driveTitle, rows],
  )

  if (!open || !placementEventId) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div className="flex max-h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-soft bg-card shadow-2xl">
        <div className="flex items-start gap-3 border-b border-soft px-4 py-4 sm:px-5">
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold text-foreground">{companyName} registrations</h3>
            <p className="mt-1 text-xs text-muted-foreground">{driveTitle}</p>
          </div>
          <SectionExportActions section={exportSection} size="xs" />
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="size-4" />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-4 sm:p-5">
          {loading ? <p className="text-sm text-muted-foreground">Loading registrations…</p> : null}
          {error ? <p className="text-sm font-semibold text-[#F6465D]">{error}</p> : null}
          {!loading && !error ? (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[960px] text-left text-xs">
                <thead className="border-b border-border bg-elevated/50 text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Submitted</th>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Roll</th>
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">Mobile</th>
                    <th className="px-3 py-2">10th</th>
                    <th className="px-3 py-2">12th</th>
                    <th className="px-3 py-2">CGPA</th>
                    <th className="px-3 py-2">Backlogs</th>
                    <th className="px-3 py-2">Resume</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-b border-border/60">
                      <td className="px-3 py-2 whitespace-nowrap">{new Date(row.submitted_at).toLocaleString()}</td>
                      <td className="px-3 py-2">{row.full_name}</td>
                      <td className="px-3 py-2 font-mono">{row.roll_number}</td>
                      <td className="px-3 py-2">{row.email}</td>
                      <td className="px-3 py-2">{row.mobile}</td>
                      <td className="px-3 py-2 tnum">{row.tenth_percentage ?? '—'}</td>
                      <td className="px-3 py-2 tnum">{row.twelfth_percentage ?? '—'}</td>
                      <td className="px-3 py-2 tnum">{row.btech_cgpa ?? '—'}</td>
                      <td className="px-3 py-2 tnum">{row.active_backlogs}</td>
                      <td className="max-w-[180px] truncate px-3 py-2">
                        <a href={row.resume_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                          {row.resume_url}
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!rows.length ? (
                <p className="px-4 py-10 text-center text-sm text-muted-foreground">No registrations yet.</p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
