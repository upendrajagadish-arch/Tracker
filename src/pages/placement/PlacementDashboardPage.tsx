import { useCallback, useEffect, useRef, useState } from 'react'
import { Download, FileSpreadsheet, RefreshCw } from 'lucide-react'
import { PlacementShell, usePlacementPaths } from '@/components/placement/PlacementShell'
import { PlacementAlerts, PlacementPageStack } from '@/components/placement/PlacementUi'
import { PlacementErrorAlert } from '@/components/placement/PlacementStates'
import {
  PremiumDashboard,
  PremiumDashboardSkeleton,
} from '@/components/placement/dashboard/PremiumDashboard'
import { HomeSkeleton } from '@/components/placement/home/HomeKit'
import { AdminHomeLanding } from '@/components/placement/home/AdminHomeLanding'
import { TpoHomeLanding } from '@/components/placement/home/TpoHomeLanding'
import { getPremiumDashboard, type DashboardSnapshot } from '@/api/placement/premiumDashboard'
import { exportDashboardPdf, exportDashboardXlsx } from '@/lib/dashboardExports'
import { isSupabaseConfigured, requireSupabase } from '@/lib/supabase'
import { PassOutYearFilterBar, usePassOutYearFilter } from '@/lib/placementYearFilter'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

type RoleVariant = 'admin' | 'tpo'
type PageMode = 'home' | 'dashboard'

function usePremiumDashboardSnapshot(channelKey: string) {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { year: batch, setYear } = usePassOutYearFilter()
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
      .channel(`premium-dashboard-${channelKey}-${batch}`)
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
  }, [batch, channelKey, load])

  return { loading, refreshing, error, batch, setYear, snapshot, load }
}

/** Classic PremiumDashboard (previous version) — also used under Home. */
export function ClassicPremiumDashboardPage() {
  const { base } = usePlacementPaths()
  const { loading, refreshing, error, batch, setYear, snapshot, load } =
    usePremiumDashboardSnapshot('classic')

  return (
    <PlacementShell>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          disabled={refreshing}
          onClick={() => void load(true)}
          className={cn(
            'inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground transition hover:text-binance disabled:opacity-50',
          )}
        >
          <RefreshCw className={cn('size-3', refreshing && 'animate-spin')} />
          Refresh
        </button>
        <PassOutYearFilterBar value={batch} onChange={setYear} />
      </div>

      <PlacementPageStack>
        <PlacementAlerts error={error} />
        {loading ? (
          <PremiumDashboardSkeleton />
        ) : snapshot ? (
          <PremiumDashboard snapshot={snapshot} base={base} />
        ) : null}
      </PlacementPageStack>

      {!loading && !snapshot && !error ? (
        <PlacementErrorAlert message="Dashboard data is unavailable." />
      ) : null}

      <div className="mt-auto flex flex-wrap items-center justify-end gap-3 border-t border-soft pt-3">
        <button
          type="button"
          disabled={refreshing}
          onClick={() => void load(true)}
          className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground transition hover:text-binance disabled:opacity-50"
        >
          <RefreshCw className={cn('size-3', refreshing && 'animate-spin')} />
          Refresh
        </button>
        <button
          type="button"
          disabled={!snapshot}
          onClick={() => snapshot && exportDashboardPdf(snapshot)}
          className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground transition hover:text-binance disabled:opacity-50"
        >
          <Download className="size-3" />
          PDF
        </button>
        <button
          type="button"
          disabled={!snapshot}
          onClick={() => {
            if (snapshot) void exportDashboardXlsx(snapshot)
          }}
          className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground transition hover:text-binance disabled:opacity-50"
        >
          <FileSpreadsheet className="size-3" />
          Excel
        </button>
      </div>
    </PlacementShell>
  )
}

/** Home = inspirational landing + previous PremiumDashboard (unchanged fields). */
export function PlacementDashboardPage({
  roleVariant = 'admin',
  mode = 'home',
}: {
  roleVariant?: RoleVariant
  mode?: PageMode
}) {
  const { base } = usePlacementPaths()
  const { placementProfile, user } = useAuth()
  const { loading, refreshing, error, batch, setYear, snapshot, load } =
    usePremiumDashboardSnapshot(`home-${roleVariant}`)

  const displayName =
    placementProfile?.full_name?.trim() ||
    user?.email?.split('@')[0] ||
    (roleVariant === 'tpo' ? 'TPO' : 'Admin')

  if (mode === 'dashboard') {
    return <ClassicPremiumDashboardPage />
  }

  return (
    <PlacementShell>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          disabled={refreshing}
          onClick={() => void load(true)}
          className={cn(
            'inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground transition hover:text-binance disabled:opacity-50',
          )}
        >
          <RefreshCw className={cn('size-3', refreshing && 'animate-spin')} />
          Refresh
        </button>
        <PassOutYearFilterBar value={batch} onChange={setYear} />
      </div>

      <PlacementPageStack>
        <PlacementAlerts error={error} />
        {loading ? (
          <HomeSkeleton />
        ) : snapshot ? (
          <>
            {roleVariant === 'tpo' ? (
              <TpoHomeLanding snapshot={snapshot} base={base} displayName={displayName} />
            ) : (
              <AdminHomeLanding snapshot={snapshot} base={base} displayName={displayName} />
            )}

            <section className="space-y-3 border-t border-soft pt-6">
              <div>
                <h2 className="font-heading text-[20px] font-bold text-white">Placement dashboard</h2>
                <p className="mt-1 text-[13px] text-[#A1A1AA]">
                  Full operational dashboard — same metrics and charts as before.
                </p>
              </div>
              <PremiumDashboard snapshot={snapshot} base={base} />
            </section>
          </>
        ) : null}
      </PlacementPageStack>

      {!loading && !snapshot && !error ? (
        <PlacementErrorAlert message="Dashboard data is unavailable." />
      ) : null}

      <div className="mt-auto flex flex-wrap items-center justify-end gap-3 border-t border-soft pt-3">
        <button
          type="button"
          disabled={!snapshot}
          onClick={() => snapshot && exportDashboardPdf(snapshot)}
          className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground transition hover:text-binance disabled:opacity-50"
        >
          <Download className="size-3" />
          PDF
        </button>
        <button
          type="button"
          disabled={!snapshot}
          onClick={() => {
            if (snapshot) void exportDashboardXlsx(snapshot)
          }}
          className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground transition hover:text-binance disabled:opacity-50"
        >
          <FileSpreadsheet className="size-3" />
          Excel
        </button>
      </div>
    </PlacementShell>
  )
}

export function AdminHomePage() {
  return <PlacementDashboardPage roleVariant="admin" mode="home" />
}

export function TpoHomePage() {
  return <PlacementDashboardPage roleVariant="tpo" mode="home" />
}
