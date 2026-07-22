import { useCallback, useEffect, useRef, useState } from 'react'
import { Download, FileSpreadsheet, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PlacementShell, usePlacementPaths } from '@/components/placement/PlacementShell'
import { PlacementPageHeader } from '@/components/placement/PlacementPageHeader'
import {
  PlacementAlerts,
  PlacementPageStack,
} from '@/components/placement/PlacementUi'
import { PlacementErrorAlert } from '@/components/placement/PlacementStates'
import {
  PremiumDashboard,
  PremiumDashboardSkeleton,
} from '@/components/placement/dashboard/PremiumDashboard'
import { getPremiumDashboard, type DashboardSnapshot } from '@/api/placement/premiumDashboard'
import { exportDashboardPdf, exportDashboardXlsx } from '@/lib/dashboardExports'
import { isSupabaseConfigured, requireSupabase } from '@/lib/supabase'
import { WorkspaceTabs } from '@/components/placement/WorkspaceTabs'
import { PassOutYearFilterBar, usePassOutYearFilter } from '@/lib/placementYearFilter'

export function PlacementDashboardPage() {
  const { base } = usePlacementPaths()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { year: batch, setYear: setBatch } = usePassOutYearFilter()
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null)
  const requestSequence = useRef(0)

  const load = useCallback(async (quiet = false) => {
    const requestId = ++requestSequence.current
    if (quiet) setRefreshing(true)
    else setLoading(true)
    setError(null)
    try {
      const nextSnapshot = await getPremiumDashboard(batch)
      if (requestId === requestSequence.current) setSnapshot(nextSnapshot)
    } catch (e) {
      if (requestId === requestSequence.current) {
        setError(e instanceof Error ? e.message : 'Failed to load dashboard')
      }
    } finally {
      if (requestId === requestSequence.current) {
        setLoading(false)
        setRefreshing(false)
      }
    }
  }, [batch])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!isSupabaseConfigured) return
    const client = requireSupabase()
    let timer = 0
    const refresh = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => void load(true), 350)
    }
    const channel = client
      .channel(`premium-dashboard-${batch}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_profiles' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'placement_events' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'company_share_links' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'communication_evaluations' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_tech_skills' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_coding_snapshots' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'aptitude_scores' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'verbal_scores' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'codenow_profiles' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'companies' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'audit_logs' }, refresh)
      .subscribe()
    return () => {
      window.clearTimeout(timer)
      void client.removeChannel(channel)
    }
  }, [batch, load])

  return (
    <PlacementShell title="Dashboard">
      <WorkspaceTabs active="placement" />

      <PlacementPageHeader
        title="Placement Dashboard"
        description="Filter by pass-out year to drill into eligibility, placement progress, and readiness analytics."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={refreshing}
              onClick={() => void load(true)}
            >
              <RefreshCw className={`size-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!snapshot}
              onClick={() => snapshot && exportDashboardPdf(snapshot)}
            >
              <Download className="size-3.5" /> PDF
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!snapshot}
              onClick={() => {
                if (snapshot) void exportDashboardXlsx(snapshot)
              }}
            >
              <FileSpreadsheet className="size-3.5" /> Excel
            </Button>
          </div>
        }
      />

      <PlacementPageStack>
        <PassOutYearFilterBar value={batch} onChange={setBatch} />

        <PlacementAlerts error={error} />
        {loading ? <PremiumDashboardSkeleton /> : snapshot ? <PremiumDashboard snapshot={snapshot} base={base} /> : null}
      </PlacementPageStack>

      {!loading && !snapshot && !error ? (
        <PlacementErrorAlert message="Dashboard data is unavailable." />
      ) : null}
    </PlacementShell>
  )
}
