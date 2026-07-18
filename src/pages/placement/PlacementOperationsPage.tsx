import { useCallback, useEffect, useState } from 'react'
import { useRouterState } from '@tanstack/react-router'
import { Bell, Building2, CalendarDays, Link2, Plus } from 'lucide-react'
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
} from '@/components/placement/PlacementUi'
import { listCompanies, type CompanyRow } from '@/api/placement/companies'
import {
  campaignRegistrationUrl,
  listCampaigns,
  type StudentUpdateCampaignRow,
} from '@/api/placement/studentUpdateCampaigns'
import {
  createCompanyShareLink,
  canManagePlacementOperations,
  schedulePlacementDrive,
  createPlacementNotification,
  listCompanyShareLinks,
  listPlacementEvents,
  listPlacementNotificationHistory,
  listPlacementNotifications,
  updateCompanyShareLink,
  updatePlacementEvent,
  type CompanyShareLinkRow,
  type PlacementEventRow,
  type PlacementNotificationRow,
} from '@/api/placement/premiumDashboard'

type Tab = 'drives' | 'links' | 'notifications'

export function PlacementOperationsPage() {
  const { role } = usePlacementPaths()
  const canManage = canManagePlacementOperations(role)
  const requestedTab = useRouterState({
    select: (state) => (state.location.search as { tab?: string }).tab,
  })
  const [tab, setTab] = useState<Tab>('drives')
  const [events, setEvents] = useState<PlacementEventRow[]>([])
  const [links, setLinks] = useState<CompanyShareLinkRow[]>([])
  const [notifications, setNotifications] = useState<PlacementNotificationRow[]>([])
  const [companies, setCompanies] = useState<CompanyRow[]>([])
  const [campaigns, setCampaigns] = useState<StudentUpdateCampaignRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [eventForm, setEventForm] = useState({
    title: '',
    companyId: '',
    startDate: '',
    startTime: '',
    venue: '',
    mode: 'on_campus',
    batches: '2027, 2028',
    campaignId: '',
  })
  const [linkForm, setLinkForm] = useState({
    companyId: '',
    label: '',
    url: '',
    batches: '2027, 2028',
    campaignId: '',
  })
  const [notificationForm, setNotificationForm] = useState({
    title: '',
    body: '',
    role: 'faculty',
  })

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [eventRows, linkRows, notificationRows, companyRows, campaignRows] = await Promise.all([
        listPlacementEvents(),
        listCompanyShareLinks(),
        canManage ? listPlacementNotificationHistory() : listPlacementNotifications(role),
        listCompanies(),
        listCampaigns().catch(() => []),
      ])
      setEvents(eventRows)
      setLinks(linkRows)
      setNotifications(notificationRows)
      setCompanies(companyRows)
      setCampaigns(campaignRows.filter((campaign) => campaign.status === 'active'))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load placement operations')
    } finally {
      setLoading(false)
    }
  }, [role, canManage])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (requestedTab === 'drives' || requestedTab === 'links' || requestedTab === 'notifications') {
      setTab(requestedTab)
    }
  }, [requestedTab])

  const parseList = (value: string) =>
    value.split(',').map((item) => item.trim()).filter(Boolean)

  const saveEvent = async () => {
    if (!eventForm.title.trim() || !eventForm.startDate || !eventForm.startTime) {
      setError('Drive title, start date, and start time are required.')
      return
    }
    if (eventForm.campaignId && !eventForm.companyId) {
      setError('Select a company to share the drive registration link.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const registrationUrl = eventForm.campaignId
        ? campaignRegistrationUrl(eventForm.campaignId)
        : null
      await schedulePlacementDrive({
        title: eventForm.title.trim(),
        companyId: eventForm.companyId || null,
        startsAt: new Date(`${eventForm.startDate}T${eventForm.startTime}`).toISOString(),
        venue: eventForm.venue.trim(),
        mode: eventForm.mode,
        audienceBatches: parseList(eventForm.batches),
        registrationUrl,
        registrationLabel: registrationUrl
          ? `${eventForm.title.trim()} — Student registration`
          : null,
      })
      setEventForm((current) => ({
        ...current,
        title: '',
        startDate: '',
        startTime: '',
        venue: '',
        campaignId: '',
      }))
      setMessage(
        eventForm.campaignId
          ? 'Drive scheduled and its portal registration link was shared in Company Links.'
          : 'Drive scheduled.',
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
    if (!linkForm.companyId || !registrationUrl) {
      setError('Company and URL are required.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await createCompanyShareLink({
        company_id: linkForm.companyId,
        label: linkForm.label.trim(),
        url: registrationUrl,
        audience_batches: parseList(linkForm.batches),
      })
      setLinkForm((current) => ({ ...current, label: '', url: '', campaignId: '' }))
      setMessage('Company link shared.')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to share company link')
    } finally {
      setSaving(false)
    }
  }

  const saveNotification = async () => {
    if (!notificationForm.title.trim()) {
      setError('Notification title is required.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await createPlacementNotification({
        title: notificationForm.title.trim(),
        body: notificationForm.body.trim(),
        audience_role: notificationForm.role,
        notification_type: 'info',
      })
      setNotificationForm((current) => ({ ...current, title: '', body: '' }))
      setMessage('Notification published.')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to publish notification')
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
        description="Manage campus drives, company links shared with students, and staff notifications."
      />
      <PlacementPageStack>
        <PlacementAlerts error={error} success={message} />
        <div className="placement-glass flex gap-2 overflow-x-auto rounded-xl p-2">
          {([
            ['drives', 'Drives', CalendarDays],
            ['links', 'Company Links', Link2],
            ['notifications', 'Notifications', Bell],
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
              <PlacementSectionCard title="Schedule drive">
                <div className="grid gap-4">
                  <PlacementField label="Drive title">
                    <Input value={eventForm.title} onChange={(e) => setEventForm((f) => ({ ...f, title: e.target.value }))} placeholder="Campus recruitment drive" />
                  </PlacementField>
                  <PlacementField label="Company">
                    <PlacementSelect value={eventForm.companyId} onChange={(value) => setEventForm((f) => ({ ...f, companyId: value }))}>
                      <option value="">No company selected</option>
                      {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
                    </PlacementSelect>
                  </PlacementField>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <PlacementField label="Start date">
                      <Input
                        type="date"
                        value={eventForm.startDate}
                        className="[color-scheme:dark]"
                        onChange={(e) => setEventForm((form) => ({ ...form, startDate: e.target.value }))}
                      />
                    </PlacementField>
                    <PlacementField label="Start time">
                      <Input
                        type="time"
                        value={eventForm.startTime}
                        className="[color-scheme:dark]"
                        onChange={(e) => setEventForm((form) => ({ ...form, startTime: e.target.value }))}
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
                  <PlacementField
                    label="Student registration link"
                    hint="Optional: selecting a portal registration campaign automatically shares its link in Company Links."
                  >
                    <PlacementSelect
                      value={eventForm.campaignId}
                      onChange={(value) => setEventForm((form) => ({ ...form, campaignId: value }))}
                    >
                      <option value="">Do not attach a registration link</option>
                      {campaigns.map((campaign) => (
                        <option key={campaign.id} value={campaign.id}>{campaign.title}</option>
                      ))}
                    </PlacementSelect>
                  </PlacementField>
                  <Button disabled={saving} onClick={() => void saveEvent()}><Plus className="size-4" /> Schedule drive</Button>
                </div>
              </PlacementSectionCard>
            ) : null}
            <PlacementSectionCard title="All drives">
              <div className="space-y-3">
                {events.map((event) => (
                  <div key={event.id} className="rounded-xl border border-border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{event.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{new Date(event.starts_at).toLocaleString()} · {event.mode.replace(/_/g, ' ')} · {event.venue || 'Venue pending'}</p>
                      </div>
                      {canManage && event.status !== 'cancelled' ? (
                        <Button size="sm" variant="ghost" disabled={saving} onClick={() => void cancelEvent(event.id)}>Cancel</Button>
                      ) : <span className="text-xs uppercase text-muted-foreground">{event.status}</span>}
                    </div>
                  </div>
                ))}
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
                  <PlacementField label="Company">
                    <PlacementSelect value={linkForm.companyId} onChange={(value) => setLinkForm((f) => ({ ...f, companyId: value }))}>
                      <option value="">Select company</option>
                      {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
                    </PlacementSelect>
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

        {tab === 'notifications' ? (
          <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            {canManage ? (
              <PlacementSectionCard title="Publish notification">
                <div className="grid gap-4">
                  <PlacementField label="Title">
                    <Input value={notificationForm.title} onChange={(e) => setNotificationForm((f) => ({ ...f, title: e.target.value }))} />
                  </PlacementField>
                  <PlacementField label="Message">
                    <textarea className="min-h-24 rounded-md border border-input bg-transparent px-3 py-2 text-sm" value={notificationForm.body} onChange={(e) => setNotificationForm((f) => ({ ...f, body: e.target.value }))} />
                  </PlacementField>
                  <PlacementField label="Audience role">
                    <PlacementSelect value={notificationForm.role} onChange={(value) => setNotificationForm((f) => ({ ...f, role: value }))}>
                      <option value="admin">Admin</option>
                      <option value="tpo">TPO</option>
                      <option value="faculty">Faculty</option>
                      <option value="interviewer">Interviewer</option>
                    </PlacementSelect>
                  </PlacementField>
                  <Button disabled={saving} onClick={() => void saveNotification()}><Bell className="size-4" /> Publish</Button>
                </div>
              </PlacementSectionCard>
            ) : null}
            <PlacementSectionCard title="Notification history">
              <div className="space-y-3">
                {notifications.map((notification) => (
                  <div key={notification.id} className="rounded-xl border border-border p-4">
                    <p className="font-semibold">{notification.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{notification.body}</p>
                    <p className="mt-2 text-[11px] uppercase text-muted-foreground">{notification.audience_role || 'Direct'} · {new Date(notification.created_at).toLocaleString()}</p>
                  </div>
                ))}
                {!notifications.length ? <p className="py-8 text-center text-sm text-muted-foreground">No notifications.</p> : null}
              </div>
            </PlacementSectionCard>
          </div>
        ) : null}
      </PlacementPageStack>
    </PlacementShell>
  )
}

