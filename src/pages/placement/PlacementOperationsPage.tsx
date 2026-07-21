import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouterState } from '@tanstack/react-router'
import { Building2, CalendarDays, Copy, Link2, Plus, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PlacementShell, usePlacementPaths } from '@/components/placement/PlacementShell'
import { PlacementPageHeader } from '@/components/placement/PlacementPageHeader'
import {
  PlacementAlerts,
  PlacementField,
  PlacementPageStack,
  PlacementSectionCard,
  PlacementSelect,
  CompanyNameCombo,
} from '@/components/placement/PlacementUi'
import { listCompanies, createCompany, type CompanyRow } from '@/api/placement/companies'
import {
  campaignRegistrationUrl,
  listCampaigns,
  type StudentUpdateCampaignRow,
} from '@/api/placement/studentUpdateCampaigns'
import {
  companyDriveRegistrationUrl,
  countDriveRegistrationsByEvent,
  listPlacementDriveLinks,
  scheduleCompanyDriveWithRegistration,
  type PlacementDriveLinkRow,
} from '@/api/placement/placementDriveRegistrations'
import { DriveRegistrationsDialog } from '@/components/placement/DriveRegistrationsDialog'
import {
  createCompanyShareLink,
  canManagePlacementOperations,
  listCompanyShareLinks,
  listPlacementEvents,
  updateCompanyShareLink,
  updatePlacementEvent,
  type CompanyShareLinkRow,
  type PlacementEventRow,
} from '@/api/placement/premiumDashboard'

type Tab = 'drives' | 'links'

export function PlacementOperationsPage() {
  const { role } = usePlacementPaths()
  const canManage = canManagePlacementOperations(role)
  const requestedTab = useRouterState({
    select: (state) => (state.location.search as { tab?: string }).tab,
  })
  const [tab, setTab] = useState<Tab>('drives')
  const [events, setEvents] = useState<PlacementEventRow[]>([])
  const [links, setLinks] = useState<CompanyShareLinkRow[]>([])
  const [companies, setCompanies] = useState<CompanyRow[]>([])
  const [campaigns, setCampaigns] = useState<StudentUpdateCampaignRow[]>([])
  const [driveLinks, setDriveLinks] = useState<PlacementDriveLinkRow[]>([])
  const [registrationCounts, setRegistrationCounts] = useState<Record<string, number>>({})
  const [registrationsView, setRegistrationsView] = useState<{
    eventId: string
    companyName: string
    driveTitle: string
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [eventForm, setEventForm] = useState({
    title: '',
    companyId: '',
    companyName: '',
    startDate: '',
    startTime: '',
    venue: '',
    mode: 'on_campus',
    batches: '2027, 2028',
    registrationCloseDate: '',
    registrationCloseTime: '',
  })
  const [linkForm, setLinkForm] = useState({
    companyId: '',
    companyName: '',
    label: '',
    url: '',
    batches: '2027, 2028',
    campaignId: '',
  })
  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [eventRows, linkRows, companyRows, campaignRows, driveLinkRows, regCounts] =
        await Promise.all([
        listPlacementEvents(),
        listCompanyShareLinks(),
        listCompanies(),
        listCampaigns().catch(() => []),
        listPlacementDriveLinks().catch(() => []),
        countDriveRegistrationsByEvent().catch(() => ({})),
      ])
      setEvents(eventRows)
      setLinks(linkRows)
      setCompanies(companyRows)
      setCampaigns(campaignRows.filter((campaign) => campaign.status === 'active'))
      setDriveLinks(driveLinkRows)
      setRegistrationCounts(regCounts)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load placement operations')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (requestedTab === 'drives' || requestedTab === 'links') {
      setTab(requestedTab)
    }
  }, [requestedTab])

  const parseList = (value: string) =>
    value.split(',').map((item) => item.trim()).filter(Boolean)

  const resolveCompanyId = async (companyId: string, companyName: string): Promise<string> => {
    if (companyId) return companyId
    const trimmed = companyName.trim()
    if (!trimmed) {
      throw new Error('Select a company from the list or type a new company name.')
    }
    const existing = companies.find((company) => company.name.toLowerCase() === trimmed.toLowerCase())
    if (existing) return existing.id
    const created = await createCompany({ name: trimmed })
    setCompanies((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)))
    return created.id
  }

  const companyNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const company of companies) map.set(company.id, company.name)
    return map
  }, [companies])

  const driveLinkByEventId = useMemo(() => {
    const map = new Map<string, PlacementDriveLinkRow>()
    for (const link of driveLinks) {
      if (!map.has(link.placement_event_id)) map.set(link.placement_event_id, link)
    }
    return map
  }, [driveLinks])

  const copyRegistrationLink = async (token: string) => {
    const url = companyDriveRegistrationUrl(token)
    await navigator.clipboard.writeText(url)
    setMessage('Registration link copied to clipboard.')
  }

  const saveEvent = async () => {
    if (!eventForm.title.trim() || !eventForm.startDate || !eventForm.startTime) {
      setError('Drive title, start date, and start time are required.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const companyId = await resolveCompanyId(eventForm.companyId, eventForm.companyName)

      const registrationClosesAt =
        eventForm.registrationCloseDate && eventForm.registrationCloseTime
          ? new Date(`${eventForm.registrationCloseDate}T${eventForm.registrationCloseTime}`).toISOString()
          : eventForm.registrationCloseDate
            ? new Date(`${eventForm.registrationCloseDate}T23:59`).toISOString()
            : null

      const scheduled = await scheduleCompanyDriveWithRegistration({
        title: eventForm.title.trim(),
        companyId,
        startsAt: new Date(`${eventForm.startDate}T${eventForm.startTime}`).toISOString(),
        registrationClosesAt,
        venue: eventForm.venue.trim(),
        mode: eventForm.mode,
        audienceBatches: parseList(eventForm.batches),
      })

      await createCompanyShareLink({
        company_id: companyId,
        label: scheduled.label,
        url: scheduled.registrationUrl,
        audience_batches: parseList(eventForm.batches),
        expires_at: registrationClosesAt,
      })

      // Carry the drive company into Company Links so staff can add more links
      // for the same company without selecting it again.
      setLinkForm((current) => ({
        ...current,
        companyId,
        companyName: scheduled.companyName,
      }))
      setEventForm((current) => ({
        ...current,
        title: '',
        companyId: '',
        companyName: '',
        startDate: '',
        startTime: '',
        venue: '',
        registrationCloseDate: '',
        registrationCloseTime: '',
      }))
      setMessage(
        `${scheduled.companyName} drive scheduled and its student registration link was shared automatically.`,
      )
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to schedule drive')
    } finally {
      setSaving(false)
    }
  }

  const saveLink = async () => {
    const registrationUrl = linkForm.campaignId
      ? campaignRegistrationUrl(linkForm.campaignId)
      : linkForm.url.trim()
    if (!registrationUrl) {
      setError('Registration URL or campaign is required.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const companyId = await resolveCompanyId(linkForm.companyId, linkForm.companyName)
      await createCompanyShareLink({
        company_id: companyId,
        label: linkForm.label.trim(),
        url: registrationUrl,
        audience_batches: parseList(linkForm.batches),
      })
      setLinkForm((current) => ({
        ...current,
        companyId: '',
        companyName: '',
        label: '',
        url: '',
        campaignId: '',
      }))
      setMessage('Company link shared.')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to share company link')
    } finally {
      setSaving(false)
    }
  }

  const cancelEvent = async (id: string) => {
    setSaving(true)
    setError(null)
    try {
      await updatePlacementEvent(id, { status: 'cancelled' })
      setMessage('Drive cancelled.')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to cancel drive')
    } finally {
      setSaving(false)
    }
  }

  const deactivateLink = async (id: string) => {
    setSaving(true)
    setError(null)
    try {
      await updateCompanyShareLink(id, { is_active: false })
      setMessage('Company link deactivated.')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to deactivate company link')
    } finally {
      setSaving(false)
    }
  }

  return (
    <PlacementShell title="Placement Operations">
      <PlacementPageHeader
        title="Placement Operations"
        description="Schedule company drives with calendar date/time, share registration links, and export student registrations."
      />
      <PlacementPageStack>
        <PlacementAlerts error={error} success={message} />
        <div className="placement-glass flex gap-2 overflow-x-auto rounded-xl p-2">
          {([
            ['drives', 'Drives', CalendarDays],
            ['links', 'Company Links', Link2],
          ] as const).map(([value, label, Icon]) => (
            <Button
              key={value}
              type="button"
              size="sm"
              variant={tab === value ? 'default' : 'ghost'}
              onClick={() => setTab(value)}
            >
              <Icon className="size-4" /> {label}
            </Button>
          ))}
        </div>

        {loading ? <p className="text-sm text-muted-foreground">Loading operations…</p> : null}

        {tab === 'drives' ? (
          <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            {canManage ? (
              <PlacementSectionCard title="Schedule company drive">
                <div className="grid gap-4">
                  <PlacementField label="Drive title">
                    <Input value={eventForm.title} onChange={(e) => setEventForm((f) => ({ ...f, title: e.target.value }))} placeholder="Campus recruitment drive" />
                  </PlacementField>
                  <PlacementField
                    label="Company"
                    hint="Choose from the dropdown or type a new company name if it is not listed"
                  >
                    <CompanyNameCombo
                      companies={companies}
                      companyId={eventForm.companyId}
                      companyName={eventForm.companyName}
                      onChange={({ companyId, companyName }) =>
                        setEventForm((f) => ({ ...f, companyId, companyName }))
                      }
                    />
                  </PlacementField>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <PlacementField label="Drive date">
                      <Input
                        type="date"
                        value={eventForm.startDate}
                        className="[color-scheme:dark]"
                        onChange={(e) => setEventForm((form) => ({ ...form, startDate: e.target.value }))}
                      />
                    </PlacementField>
                    <PlacementField label="Drive time">
                      <Input
                        type="time"
                        value={eventForm.startTime}
                        className="[color-scheme:dark]"
                        onChange={(e) => setEventForm((form) => ({ ...form, startTime: e.target.value }))}
                      />
                    </PlacementField>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <PlacementField label="Registration closes (date)">
                      <Input
                        type="date"
                        value={eventForm.registrationCloseDate}
                        className="[color-scheme:dark]"
                        onChange={(e) => setEventForm((form) => ({ ...form, registrationCloseDate: e.target.value }))}
                      />
                    </PlacementField>
                    <PlacementField label="Registration closes (time)">
                      <Input
                        type="time"
                        value={eventForm.registrationCloseTime}
                        className="[color-scheme:dark]"
                        onChange={(e) => setEventForm((form) => ({ ...form, registrationCloseTime: e.target.value }))}
                      />
                    </PlacementField>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <PlacementField label="Mode">
                      <PlacementSelect value={eventForm.mode} onChange={(value) => setEventForm((f) => ({ ...f, mode: value }))}>
                        <option value="on_campus">On campus</option>
                        <option value="off_campus">Off campus</option>
                        <option value="virtual">Virtual</option>
                      </PlacementSelect>
                    </PlacementField>
                    <PlacementField label="Venue">
                      <Input value={eventForm.venue} onChange={(e) => setEventForm((f) => ({ ...f, venue: e.target.value }))} />
                    </PlacementField>
                  </div>
                  <PlacementField label="Audience batches" hint="Comma-separated graduation years">
                    <Input value={eventForm.batches} onChange={(e) => setEventForm((f) => ({ ...f, batches: e.target.value }))} />
                  </PlacementField>
                  <p className="text-xs text-secondary">
                    Creates a company-branded registration form (name, roll number, email, mobile, 10th/12th marks, CGPA, backlogs, resume link) and shares the link automatically.
                  </p>
                  <Button disabled={saving} onClick={() => void saveEvent()}><Plus className="size-4" /> Create drive & registration link</Button>
                </div>
              </PlacementSectionCard>
            ) : null}
            <PlacementSectionCard title="All company drives">
              <div className="space-y-3">
                {events.map((event) => {
                  const driveLink = driveLinkByEventId.get(event.id)
                  const companyName = event.company_id ? companyNameById.get(event.company_id) ?? 'Company' : 'Company'
                  const count = registrationCounts[event.id] ?? 0
                  return (
                  <div key={event.id} className="rounded-xl border border-border p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-semibold">{companyName} · {event.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{new Date(event.starts_at).toLocaleString()} · {event.mode.replace(/_/g, ' ')} · {event.venue || 'Venue pending'}</p>
                        <p className="mt-2 text-xs font-semibold text-[#D27918]">{count} registration{count === 1 ? '' : 's'}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {driveLink ? (
                          <Button size="sm" variant="outline" disabled={saving} onClick={() => void copyRegistrationLink(driveLink.token)}>
                            <Copy className="size-3.5" /> Copy link
                          </Button>
                        ) : null}
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={saving}
                          onClick={() =>
                            setRegistrationsView({
                              eventId: event.id,
                              companyName,
                              driveTitle: event.title,
                            })
                          }
                        >
                          <Users className="size-3.5" /> View / Excel
                        </Button>
                        {canManage && event.status !== 'cancelled' ? (
                          <Button size="sm" variant="ghost" disabled={saving} onClick={() => void cancelEvent(event.id)}>Cancel</Button>
                        ) : (
                          <span className="self-center text-xs uppercase text-muted-foreground">{event.status}</span>
                        )}
                      </div>
                    </div>
                  </div>
                )})}
                {!events.length ? <p className="py-8 text-center text-sm text-muted-foreground">No drives scheduled.</p> : null}
              </div>
            </PlacementSectionCard>
          </div>
        ) : null}

        {tab === 'links' ? (
          <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            {canManage ? (
              <PlacementSectionCard title="Share company link">
                <div className="grid gap-4">
                  <PlacementField
                    label="Company"
                    hint="Dropdown lists saved companies; type a name to add a new one"
                  >
                    <CompanyNameCombo
                      companies={companies}
                      companyId={linkForm.companyId}
                      companyName={linkForm.companyName}
                      onChange={({ companyId, companyName }) =>
                        setLinkForm((f) => ({
                          ...f,
                          companyId,
                          companyName,
                          label:
                            f.label ||
                            (companyName.trim() ? `${companyName.trim()} — Student registration` : f.label),
                        }))
                      }
                    />
                  </PlacementField>
                  <PlacementField label="Link label">
                    <Input value={linkForm.label} onChange={(e) => setLinkForm((f) => ({ ...f, label: e.target.value }))} placeholder="Job description / registration" />
                  </PlacementField>
                  <PlacementField
                    label="Portal registration campaign"
                    hint="Choose an existing student registration form, or enter an external URL below."
                  >
                    <PlacementSelect
                      value={linkForm.campaignId}
                      onChange={(value) => {
                        const campaign = campaigns.find((item) => item.id === value)
                        setLinkForm((form) => ({
                          ...form,
                          campaignId: value,
                          label: form.label || (campaign ? `${campaign.title} — Student registration` : ''),
                        }))
                      }}
                    >
                      <option value="">Use an external registration URL</option>
                      {campaigns.map((campaign) => (
                        <option key={campaign.id} value={campaign.id}>{campaign.title}</option>
                      ))}
                    </PlacementSelect>
                  </PlacementField>
                  <PlacementField label="External URL">
                    <Input
                      type="url"
                      value={linkForm.url}
                      disabled={Boolean(linkForm.campaignId)}
                      onChange={(e) => setLinkForm((f) => ({ ...f, url: e.target.value }))}
                      placeholder={linkForm.campaignId ? campaignRegistrationUrl(linkForm.campaignId) : 'https://…'}
                    />
                  </PlacementField>
                  <PlacementField label="Audience batches">
                    <Input value={linkForm.batches} onChange={(e) => setLinkForm((f) => ({ ...f, batches: e.target.value }))} />
                  </PlacementField>
                  <Button disabled={saving} onClick={() => void saveLink()}><Link2 className="size-4" /> Share link</Button>
                </div>
              </PlacementSectionCard>
            ) : null}
            <PlacementSectionCard title="Shared company links">
              <div className="space-y-3">
                {links.map((link) => (
                  <div key={link.id} className="flex items-center gap-3 rounded-xl border border-border p-4">
                    <Building2 className="size-5 text-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-[#D27918]">
                        {companyNameById.get(link.company_id) ?? 'Company'}
                      </p>
                      <p className="truncate font-semibold">{link.label || 'Company opportunity'}</p>
                      <a href={link.url} target="_blank" rel="noreferrer" className="block truncate text-xs text-primary hover:underline">{link.url}</a>
                      <p className="mt-1 text-[11px] text-muted-foreground">{link.audience_batches.join(', ') || 'All batches'} · shared {new Date(link.shared_at).toLocaleDateString()}</p>
                    </div>
                    {canManage && link.is_active ? <Button size="sm" variant="ghost" disabled={saving} onClick={() => void deactivateLink(link.id)}>Deactivate</Button> : null}
                  </div>
                ))}
                {!links.length ? <p className="py-8 text-center text-sm text-muted-foreground">No company links shared.</p> : null}
              </div>
            </PlacementSectionCard>
          </div>
        ) : null}

      </PlacementPageStack>

      <DriveRegistrationsDialog
        open={registrationsView != null}
        onClose={() => setRegistrationsView(null)}
        placementEventId={registrationsView?.eventId ?? null}
        companyName={registrationsView?.companyName ?? ''}
        driveTitle={registrationsView?.driveTitle ?? ''}
      />
    </PlacementShell>
  )
}

