import { useCallback, useEffect, useState } from 'react'
import { PlacementShell, usePlacementPaths } from '@/components/placement/PlacementShell'
import { PlacementAlerts, PlacementPageStack } from '@/components/placement/PlacementUi'
import { HomeSkeleton } from '@/components/placement/home/HomeKit'
import { FacultyHomeLanding } from '@/components/placement/home/FacultyHomeLanding'
import { listStudents } from '@/api/placement/students'
import { getCampaignSummary } from '@/api/placement/studentUpdateCampaigns'
import { PassOutYearFilterBar, studentMatchesPassOutYear, usePassOutYearFilter } from '@/lib/placementYearFilter'
import { useAuth } from '@/hooks/useAuth'
import type { TrainingYear } from '@/lib/trainingPrograms'

export function FacultyDashboardPage() {
  const { base } = usePlacementPaths()
  const { placementProfile, user } = useAuth()
  const { year, setYear, graduationYear } = usePassOutYearFilter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sectionFilter, setSectionFilter] = useState<string | undefined>()
  const [students, setStudents] = useState<Awaited<ReturnType<typeof listStudents>>['data']>([])
  const [campaignSummary, setCampaignSummary] = useState<Awaited<
    ReturnType<typeof getCampaignSummary>
  > | null>(null)

  const displayName =
    placementProfile?.full_name?.trim() || user?.email?.split('@')[0] || 'Faculty'

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [result, summary] = await Promise.all([
        listStudents({
          page: 1,
          limit: 500,
          orderBy: 'full_name',
          orderAscending: true,
          graduationYear,
          section: sectionFilter,
        }),
        getCampaignSummary().catch(() => null),
      ])
      setStudents(result.data.filter((student) => studentMatchesPassOutYear(student, year)))
      setCampaignSummary(summary)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load faculty home')
    } finally {
      setLoading(false)
    }
  }, [graduationYear, sectionFilter, year])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <PlacementShell>
      <div className="mb-1 flex justify-end">
        <PassOutYearFilterBar
          value={year}
          onChange={(next) => {
            setYear(next)
            setSectionFilter(undefined)
          }}
        />
      </div>

      <PlacementPageStack>
        <PlacementAlerts error={error} />
        {loading ? (
          <HomeSkeleton />
        ) : (
          <FacultyHomeLanding
            students={students}
            campaignSummary={campaignSummary}
            base={base}
            displayName={displayName}
            year={year === 'all' ? 'all' : (Number(year) as TrainingYear)}
            onYearChange={(next) => {
              setYear(next === 'all' ? 'all' : (String(next) as typeof year))
              setSectionFilter(undefined)
            }}
            onProgramFilter={(section) => setSectionFilter(section)}
          />
        )}
      </PlacementPageStack>
    </PlacementShell>
  )
}
