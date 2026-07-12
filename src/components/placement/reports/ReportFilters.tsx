import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

export interface ReportFilterValues {
  branch?: string
  batch?: string
  placementStatus?: string
  readinessStatus?: string
  dateFrom?: string
  dateTo?: string
}

const PLACEMENT_STATUSES = [
  { value: '', label: 'All statuses' },
  { value: 'NOT_STARTED', label: 'Not started' },
  { value: 'IN_TRAINING', label: 'In training' },
  { value: 'READY', label: 'Ready' },
  { value: 'SHORTLISTED', label: 'Shortlisted' },
  { value: 'PLACED', label: 'Placed' },
  { value: 'NEEDS_ATTENTION', label: 'Needs attention' },
]

const READINESS_STATUSES = [
  { value: '', label: 'All readiness' },
  { value: 'highly_ready', label: 'Highly ready' },
  { value: 'placement_ready', label: 'Placement ready' },
  { value: 'near_ready', label: 'Near ready' },
  { value: 'needs_improvement', label: 'Needs improvement' },
  { value: 'not_ready', label: 'Not ready' },
]

interface ReportFiltersProps {
  filters: ReportFilterValues
  onChange: (filters: ReportFilterValues) => void
  onSubmit: (e: React.FormEvent) => void
  showDateRange?: boolean
}

export function ReportFilters({ filters, onChange, onSubmit, showDateRange = true }: ReportFiltersProps) {
  const set = (key: keyof ReportFilterValues, value: string) => onChange({ ...filters, [key]: value })

  return (
    <Card className="term-window border-border bg-card/80 print:hidden">
      <CardHeader className="border-b border-border pb-3">
        <CardTitle className="text-sm font-semibold text-foreground">Filters</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block text-sm">
              <span className="text-muted-foreground">Branch</span>
              <Input
                className="mt-1 border-border bg-card"
                value={filters.branch || ''}
                onChange={(e) => set('branch', e.target.value)}
                placeholder="e.g. CSE"
              />
            </label>
            <label className="block text-sm">
              <span className="text-muted-foreground">Batch</span>
              <Input
                className="mt-1 border-border bg-card"
                value={filters.batch || ''}
                onChange={(e) => set('batch', e.target.value)}
                placeholder="e.g. 2025"
              />
            </label>
            <label className="block text-sm">
              <span className="text-muted-foreground">Placement status</span>
              <select
                className="mt-1 flex h-8 w-full rounded-lg term-window border-border bg-card/80 px-2.5 text-sm"
                value={filters.placementStatus || ''}
                onChange={(e) => set('placementStatus', e.target.value)}
              >
                {PLACEMENT_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-muted-foreground">Readiness status</span>
              <select
                className="mt-1 flex h-8 w-full rounded-lg term-window border-border bg-card/80 px-2.5 text-sm"
                value={filters.readinessStatus || ''}
                onChange={(e) => set('readinessStatus', e.target.value)}
              >
                {READINESS_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </label>
            {showDateRange ? (
              <>
                <label className="block text-sm">
                  <span className="text-muted-foreground">Date from</span>
                  <Input
                    type="date"
                    className="mt-1 border-border bg-card"
                    value={filters.dateFrom || ''}
                    onChange={(e) => set('dateFrom', e.target.value)}
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-muted-foreground">Date to</span>
                  <Input
                    type="date"
                    className="mt-1 border-border bg-card"
                    value={filters.dateTo || ''}
                    onChange={(e) => set('dateTo', e.target.value)}
                  />
                </label>
              </>
            ) : null}
          </div>
          <Button type="submit" size="sm">Apply filters</Button>
        </form>
      </CardContent>
    </Card>
  )
}
