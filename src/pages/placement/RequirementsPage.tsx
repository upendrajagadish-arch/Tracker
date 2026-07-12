import { useEffect, useState } from 'react'
import { PlacementLink } from '@/components/placement/PlacementLink'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PlacementShell, usePlacementPaths } from '@/components/placement/PlacementShell'
import { PlacementPageHeader } from '@/components/placement/PlacementPageHeader'
import { PlacementEmptyState, PlacementErrorAlert, PlacementLoadingBlock } from '@/components/placement/PlacementStates'
import { listCompanies, listRequirements } from '@/api/placement/companies'
import type { CompanyRequirementRow } from '@/api/placement/companies'

export function RequirementsPage() {
  const { base } = usePlacementPaths()
  const [requirements, setRequirements] = useState<(CompanyRequirementRow & { companyName: string })[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const companies = await listCompanies()
        const all: (CompanyRequirementRow & { companyName: string })[] = []
        for (const company of companies) {
          const reqs = await listRequirements(company.id)
          reqs.forEach((req) => all.push({ ...req, companyName: company.name }))
        }
        setRequirements(all)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load requirements')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  return (
    <PlacementShell title="Requirements">
      <PlacementPageHeader
        title="Company Requirements"
        description="All open and draft role requirements across companies."
      />

      {error ? <div className="mb-4"><PlacementErrorAlert message={error} /></div> : null}
      {loading ? <PlacementLoadingBlock /> : null}

      {!loading && !requirements.length ? (
        <PlacementEmptyState title="No requirements" description="Create requirements from a company detail page." />
      ) : null}

      {!loading && requirements.length > 0 ? (
        <div className="grid gap-4">
          {requirements.map((req) => (
            <Card key={req.id} className="term-window border-border bg-card/80">
              <CardHeader className="border-b border-border pb-3">
                <CardTitle className="text-base">
                  {base ? (
                    <PlacementLink href={`${base}/requirements/$id`} params={{ id: req.id }} className="text-primary hover:underline">
                      {req.role_title}
                    </PlacementLink>
                  ) : req.role_title}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-1 pt-3 text-sm text-muted-foreground sm:grid-cols-2">
                <p><span className="text-muted-foreground">Company:</span> {req.companyName}</p>
                <p><span className="text-muted-foreground">Status:</span> {req.status}</p>
                <p><span className="text-muted-foreground">Min CGPA:</span> {req.min_cgpa ?? '—'}</p>
                <p><span className="text-muted-foreground">Min readiness:</span> {req.min_readiness_score ?? '—'}</p>
                <p className="sm:col-span-2"><span className="text-muted-foreground">Required skills:</span> {req.required_skills?.join(', ') || '—'}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}
    </PlacementShell>
  )
}
