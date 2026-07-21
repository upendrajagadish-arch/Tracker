import { useEffect, useState, type FormEvent } from 'react'
import { useParams } from '@tanstack/react-router'
import { Building2, CalendarClock, MapPin } from 'lucide-react'
import { SeoHead } from '@/components/SeoHead'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PlacementLoadingBlock } from '@/components/placement/PlacementStates'
import {
  getPublicDriveRegistrationForm,
  submitPublicDriveRegistration,
  type PublicDriveRegistrationForm,
} from '@/api/placement/placementDriveRegistrations'
import { BRAND_NAME } from '@/lib/brand'

const emptyForm = {
  fullName: '',
  rollNumber: '',
  email: '',
  mobile: '',
  tenthPercentage: '',
  twelfthPercentage: '',
  btechCgpa: '',
  activeBacklogs: '0',
  resumeUrl: '',
}

export function CompanyDriveRegistrationPage() {
  const { token } = useParams({ strict: false }) as { token: string }
  const [meta, setMeta] = useState<PublicDriveRegistrationForm | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await getPublicDriveRegistrationForm(token)
        if (!active) return
        if (!data) {
          setError('This company drive registration link is invalid or has expired.')
          return
        }
        setMeta(data)
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : 'Failed to load registration form')
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [token])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!meta) return
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const tenth = Number(form.tenthPercentage)
      const twelfth = Number(form.twelfthPercentage)
      const cgpa = Number(form.btechCgpa)
      const backlogs = Number(form.activeBacklogs)
      if (!Number.isFinite(tenth) || !Number.isFinite(twelfth) || !Number.isFinite(cgpa)) {
        setError('Enter valid numeric values for 10th, 12th, and B.Tech CGPA.')
        return
      }
      const result = await submitPublicDriveRegistration(token, {
        fullName: form.fullName.trim(),
        rollNumber: form.rollNumber.trim(),
        email: form.email.trim(),
        mobile: form.mobile.trim(),
        tenthPercentage: tenth,
        twelfthPercentage: twelfth,
        btechCgpa: cgpa,
        activeBacklogs: Number.isFinite(backlogs) ? backlogs : 0,
        resumeUrl: form.resumeUrl.trim(),
      })
      if (!result.ok) throw new Error(result.error || 'Registration failed')
      setSuccess(`Registration submitted successfully for ${meta.companyName}.`)
      setForm(emptyForm)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit registration')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-1 flex-col px-4 py-10">
        <PlacementLoadingBlock label="Loading company drive registration…" />
      </div>
    )
  }

  return (
    <>
      <SeoHead
        title={meta ? `${meta.companyName} Drive Registration` : 'Company drive registration'}
        description={`Register for ${meta?.companyName ?? 'company'} placement drive via ${BRAND_NAME}.`}
      />
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-10 sm:px-6">
        {error && !meta ? (
          <Card className="border-[#F6465D]/30">
            <CardContent className="py-8 text-center text-sm font-semibold text-[#F6465D]">{error}</CardContent>
          </Card>
        ) : null}

        {meta ? (
          <Card className="overflow-hidden border-soft">
            <CardHeader className="border-b border-soft bg-gradient-to-br from-[#D27918]/10 to-transparent">
              <div className="flex items-start gap-3">
                <div className="rounded-xl border border-[#D27918]/30 bg-[#D27918]/10 p-2">
                  <Building2 className="size-5 text-[#D27918]" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#D27918]">Company drive</p>
                  <CardTitle className="mt-1 text-2xl">{meta.companyName}</CardTitle>
                  <p className="mt-1 text-sm text-secondary">{meta.driveTitle}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarClock className="size-3.5" />
                  {new Date(meta.startsAt).toLocaleString()}
                </span>
                {meta.venue ? (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="size-3.5" />
                    {meta.venue}
                  </span>
                ) : null}
                {meta.registrationClosesAt ? (
                  <span>Register by {new Date(meta.registrationClosesAt).toLocaleString()}</span>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {error ? <p className="mb-4 text-sm font-semibold text-[#F6465D]">{error}</p> : null}
              {success ? <p className="mb-4 text-sm font-semibold text-[#0ECB81]">{success}</p> : null}

              <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm sm:col-span-2">
                  <span className="text-muted-foreground">Full name *</span>
                  <Input className="mt-1" required value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} />
                </label>
                <label className="text-sm">
                  <span className="text-muted-foreground">Roll number *</span>
                  <Input className="mt-1 font-mono" required value={form.rollNumber} onChange={(e) => setForm((f) => ({ ...f, rollNumber: e.target.value }))} />
                </label>
                <label className="text-sm">
                  <span className="text-muted-foreground">Email *</span>
                  <Input type="email" className="mt-1" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
                </label>
                <label className="text-sm">
                  <span className="text-muted-foreground">Mobile number *</span>
                  <Input className="mt-1" required value={form.mobile} onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))} />
                </label>
                <label className="text-sm">
                  <span className="text-muted-foreground">10th marks (%) *</span>
                  <Input type="number" step="0.01" min={0} max={100} className="mt-1" required value={form.tenthPercentage} onChange={(e) => setForm((f) => ({ ...f, tenthPercentage: e.target.value }))} />
                </label>
                <label className="text-sm">
                  <span className="text-muted-foreground">12th marks (%) *</span>
                  <Input type="number" step="0.01" min={0} max={100} className="mt-1" required value={form.twelfthPercentage} onChange={(e) => setForm((f) => ({ ...f, twelfthPercentage: e.target.value }))} />
                </label>
                <label className="text-sm">
                  <span className="text-muted-foreground">B.Tech CGPA *</span>
                  <Input type="number" step="0.01" min={0} max={10} className="mt-1" required value={form.btechCgpa} onChange={(e) => setForm((f) => ({ ...f, btechCgpa: e.target.value }))} />
                </label>
                <label className="text-sm">
                  <span className="text-muted-foreground">Active backlogs *</span>
                  <Input type="number" min={0} className="mt-1" required value={form.activeBacklogs} onChange={(e) => setForm((f) => ({ ...f, activeBacklogs: e.target.value }))} />
                </label>
                <label className="text-sm sm:col-span-2">
                  <span className="text-muted-foreground">Resume link (URL) *</span>
                  <Input type="url" className="mt-1" required placeholder="https://…" value={form.resumeUrl} onChange={(e) => setForm((f) => ({ ...f, resumeUrl: e.target.value }))} />
                </label>
                <div className="sm:col-span-2">
                  <Button type="submit" disabled={saving} className="w-full sm:w-auto">
                    {saving ? 'Submitting…' : `Register for ${meta.companyName}`}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </>
  )
}
