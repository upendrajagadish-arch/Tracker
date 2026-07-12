import { useEffect, useState } from 'react'
import { PlacementLink } from '@/components/placement/PlacementLink'
import { useParams } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { PlacementShell, usePlacementPaths } from '@/components/placement/PlacementShell'
import { PlacementPageHeader } from '@/components/placement/PlacementPageHeader'
import { PlacementEmptyState, PlacementErrorAlert, PlacementLoadingBlock } from '@/components/placement/PlacementStates'
import { createRequirement, getCompany, listRequirements } from '@/api/placement/companies'
import { canManageCompanies } from '@/lib/placementNavigation'

export function CompanyDetailPage() {
  const { id } = useParams({ strict: false }) as { id: string }
  const { base, role } = usePlacementPaths()
  const canManage = canManageCompanies(role)
  const [company, setCompany] = useState<Awaited<ReturnType<typeof getCompany>>>(null)
  const [requirements, setRequirements] = useState<Awaited<ReturnType<typeof listRequirements>>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [roleTitle, setRoleTitle] = useState('')
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [c, reqs] = await Promise.all([getCompany(id), listRequirements(id)])
      if (!c) setError('Company not found')
      setCompany(c)
      setRequirements(reqs)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load company')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [id])

  const handleAddRequirement = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await createRequirement(id, { roleTitle, status: 'open' })
      setRoleTitle('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create requirement')
    } finally {
      setSaving(false)
    }
  }

  return (
    <PlacementShell title="Company Detail">
      <PlacementPageHeader
        title={company?.name ?? 'Company'}
        description={company ? [company.industry, company.location].filter(Boolean).join(' · ') : undefined}
        actions={
          base ? (
            <Button asChild variant="outline" size="sm">
              <PlacementLink href={`${base}/companies`}>← Companies</PlacementLink>
            </Button>
          ) : null
        }
      />

      {error ? <div className="mb-4"><PlacementErrorAlert message={error} /></div> : null}
      {loading ? <PlacementLoadingBlock /> : null}

      {!loading && company ? (
        <div className="space-y-6">
          <Card className="term-window border-border bg-card/80">
            <CardHeader className="border-b border-border">
              <CardTitle className="text-base">Contact</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 text-sm text-muted-foreground">
              <p>{company.contact_email || 'No contact email'}</p>
            </CardContent>
          </Card>

          <Card className="term-window border-border bg-card/80">
            <CardHeader className="border-b border-border">
              <CardTitle className="text-base">Requirements ({requirements.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {canManage ? (
                <form onSubmit={handleAddRequirement} className="flex gap-2">
                  <Input placeholder="Role title" required value={roleTitle} onChange={(e) => setRoleTitle(e.target.value)} className="border-border bg-card" />
                  <Button type="submit" size="sm" disabled={saving}>{saving ? 'Adding…' : 'Add'}</Button>
                </form>
              ) : null}

              {requirements.length ? (
                <ul className="divide-y divide-border">
                  {requirements.map((req) => (
                    <li key={req.id} className="flex items-center justify-between py-3 text-sm">
                      <div>
                        <p className="font-medium text-foreground">{req.role_title}</p>
                        <p className="text-xs text-muted-foreground">{req.status} · min readiness {req.min_readiness_score ?? '—'}</p>
                      </div>
                      {base ? (
                        <PlacementLink href={`${base}/requirements/$id`} params={{ id: req.id }} className="text-primary hover:underline">
                          View
                        </PlacementLink>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <PlacementEmptyState title="No requirements" description="Add a role requirement for this company." />
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </PlacementShell>
  )
}
