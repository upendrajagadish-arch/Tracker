import { useEffect, useState } from 'react'
import { PlacementLink } from '@/components/placement/PlacementLink'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PlacementShell, usePlacementPaths } from '@/components/placement/PlacementShell'
import { PlacementPageHeader } from '@/components/placement/PlacementPageHeader'
import { PlacementEmptyState } from '@/components/placement/PlacementStates'
import {
  PlacementAlerts,
  PlacementField,
  PlacementPageBody,
  PlacementPageStack,
  PlacementSectionCard,
} from '@/components/placement/PlacementUi'
import { createCompany, listCompanies } from '@/api/placement/companies'
import { canManageCompanies } from '@/lib/placementNavigation'

export function CompaniesPage() {
  const { base, role } = usePlacementPaths()
  const canManage = canManageCompanies(role)
  const [companies, setCompanies] = useState<Awaited<ReturnType<typeof listCompanies>>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [industry, setIndustry] = useState('')
  const [location, setLocation] = useState('')
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      setCompanies(await listCompanies())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load companies')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await createCompany({ name, industry, location })
      setName('')
      setIndustry('')
      setLocation('')
      setShowForm(false)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <PlacementShell title="Companies">
      <PlacementPageHeader
        title="Companies"
        description="Manage recruiting partners, hiring requirements, and company profiles."
        actions={
          canManage ? (
            <Button size="sm" variant="outline" onClick={() => setShowForm((v) => !v)}>
              {showForm ? 'Cancel' : 'Add company'}
            </Button>
          ) : null
        }
      />

      <PlacementPageStack>
        <PlacementAlerts error={error} />

        {showForm && canManage ? (
          <PlacementSectionCard title="Add company" description="Create a new recruiting partner profile.">
            <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-3">
              <PlacementField label="Company name">
                <Input placeholder="e.g. Infosys" required value={name} onChange={(e) => setName(e.target.value)} className="border-border bg-card" />
              </PlacementField>
              <PlacementField label="Industry">
                <Input placeholder="e.g. IT Services" value={industry} onChange={(e) => setIndustry(e.target.value)} className="border-border bg-card" />
              </PlacementField>
              <PlacementField label="Location">
                <Input placeholder="e.g. Bengaluru" value={location} onChange={(e) => setLocation(e.target.value)} className="border-border bg-card" />
              </PlacementField>
              <div className="sm:col-span-3">
                <Button type="submit" size="sm" disabled={saving}>
                  {saving ? 'Saving…' : 'Create company'}
                </Button>
              </div>
            </form>
          </PlacementSectionCard>
        ) : null}

        <PlacementPageBody
          loading={loading}
          loadingLabel="Loading companies…"
          empty={!companies.length ? (
            <PlacementEmptyState
              title="No companies added"
              description="Add your first recruiting partner to start tracking placement requirements."
            />
          ) : undefined}
        >
          {companies.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {companies.map((company) => (
                <PlacementSectionCard key={company.id} title={company.name}>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>{company.industry || 'Industry not set'}</p>
                    <p>{company.location || 'Location not set'}</p>
                    {company.contact_email ? <p>{company.contact_email}</p> : null}
                    {base ? (
                      <Button asChild variant="outline" size="sm" className="mt-3">
                        <PlacementLink href={`${base}/companies/$id`} params={{ id: company.id }}>View details</PlacementLink>
                      </Button>
                    ) : null}
                  </div>
                </PlacementSectionCard>
              ))}
            </div>
          ) : null}
        </PlacementPageBody>
      </PlacementPageStack>
    </PlacementShell>
  )
}
