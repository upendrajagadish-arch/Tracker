import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getActiveResume } from '@/api/placement/resumes'
import type { CampaignRegistrantRow } from '@/api/placement/studentUpdateCampaigns'
import { buildCampaignRegistrantFields } from '@/lib/campaignAllowlistFields'

export function CampaignRegistrantDialog({
  open,
  onClose,
  registrant,
  allowlistedFields,
  campaignTitle,
}: {
  open: boolean
  onClose: () => void
  registrant: CampaignRegistrantRow | null
  allowlistedFields: string[]
  campaignTitle: string
}) {
  const [resumeUploaded, setResumeUploaded] = useState<boolean | null>(null)
  const [loadingResume, setLoadingResume] = useState(false)

  const showResume = allowlistedFields.includes('resume')

  useEffect(() => {
    if (!open || !registrant || !showResume) {
      setResumeUploaded(null)
      return
    }

    let active = true
    void (async () => {
      setLoadingResume(true)
      try {
        const resume = await getActiveResume(registrant.id)
        if (active) setResumeUploaded(Boolean(resume))
      } catch {
        if (active) setResumeUploaded(false)
      } finally {
        if (active) setLoadingResume(false)
      }
    })()

    return () => {
      active = false
    }
  }, [open, registrant, showResume])

  const fields = useMemo(() => {
    if (!registrant) return []
    return buildCampaignRegistrantFields(registrant, allowlistedFields, resumeUploaded)
  }, [registrant, allowlistedFields, resumeUploaded])

  if (!open || !registrant) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-soft bg-card shadow-2xl">
        <div className="flex items-start gap-3 border-b border-soft px-4 py-4 sm:px-5">
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold text-foreground">{registrant.full_name}</h3>
            <p className="mt-1 font-mono text-xs text-muted-foreground">{registrant.roll_number}</p>
            <p className="mt-1 text-xs text-muted-foreground">{campaignTitle}</p>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="size-4" />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-4 sm:p-5">
          {loadingResume ? (
            <p className="mb-3 text-xs text-muted-foreground">Checking resume status…</p>
          ) : null}
          <dl className="divide-y divide-border rounded-lg border border-border">
            {fields.map((field) => (
              <div key={field.key} className="grid gap-1 px-3 py-2.5 text-sm sm:grid-cols-3 sm:gap-3">
                <dt className="font-medium text-muted-foreground">{field.label}</dt>
                <dd className="min-w-0 break-words text-foreground sm:col-span-2">{field.value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-xs text-muted-foreground">
            Registered {new Date(registrant.created_at).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  )
}
