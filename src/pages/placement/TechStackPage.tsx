import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PlacementShell } from '@/components/placement/PlacementShell'
import { PlacementPageHeader } from '@/components/placement/PlacementPageHeader'
import { TechStackModuleNav } from '@/components/placement/TechStackModuleNav'
import { PlacementEmptyState, PlacementStatCard } from '@/components/placement/PlacementStates'
import {
  PlacementAlerts,
  PlacementField,
  PlacementFilterCard,
  PlacementPageBody,
  PlacementPageStack,
  PlacementSectionCard,
  PlacementSelect,
  formatEnumLabel,
} from '@/components/placement/PlacementUi'
import {
  BADGE_CHART_COLORS,
  LuxuryBarChart,
  LuxuryDonutChart,
} from '@/components/placement/charts'
import { TechReadinessRadialChart } from '@/components/placement/dashboard/PremiumDashboard'
import {
  TECH_STACK_BADGE_EMOJI,
  TECH_STACK_BADGE_LABELS,
  TECH_STACK_BADGE_ORDER,
} from '@/lib/techStackBadge'
import {
  SKILL_CATEGORIES,
  createTechSkill,
  getTechStackDashboardStats,
  listTechSkills,
  updateTechSkill,
  type SkillCategory,
} from '@/api/placement/techSkills'
import { getPremiumDashboard, type DashboardSnapshot } from '@/api/placement/premiumDashboard'
import { useAuth } from '@/hooks/useAuth'
import { canManageSkillMaster, canViewTechStack } from '@/lib/placementPermissions'
import { PassOutYearFilterBar, usePassOutYearFilter } from '@/lib/placementYearFilter'

export function TechStackPage() {
  const { placementRole } = useAuth()
  const canView = canViewTechStack(placementRole)
  const canManageMaster = canManageSkillMaster(placementRole)
  const { year, setYear, graduationYear } = usePassOutYearFilter()
  const [skills, setSkills] = useState<Awaited<ReturnType<typeof listTechSkills>>>([])
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getTechStackDashboardStats>> | null>(null)
  const [techReadiness, setTechReadiness] = useState<DashboardSnapshot['techReadiness']>([])
  const [search, setSearch] = useState('')
  const [masterForm, setMasterForm] = useState({ name: '', category: 'PROGRAMMING_LANGUAGE' as SkillCategory })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!canView) return
    setLoading(true)
    setError(null)
    try {
      const yearKey = year === 'all' ? 'all' : year
      const [catalog, dashboardStats, snapshot] = await Promise.all([
        listTechSkills(false),
        getTechStackDashboardStats({ graduationYear }),
        getPremiumDashboard(yearKey).catch(() => null),
      ])
      setSkills(catalog)
      setStats(dashboardStats)
      setTechReadiness(snapshot?.techReadiness ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load tech stack data')
    } finally {
      setLoading(false)
    }
  }, [canView, graduationYear, year])

  useEffect(() => {
    void load()
  }, [load])

  const handleCreateSkill = async () => {
    if (!masterForm.name.trim()) return
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const created = await createTechSkill(masterForm)
      const typedName = masterForm.name.trim()
      setMasterForm({ name: '', category: 'PROGRAMMING_LANGUAGE' })
      setSkills((current) => {
        const without = current.filter((skill) => skill.id !== created.id)
        return [...without, created].sort((a, b) => a.name.localeCompare(b.name))
      })
      setTechReadiness((current) => {
        const without = current.filter(
          (row) => row.name.toLowerCase() !== created.name.toLowerCase(),
        )
        return [
          { name: created.name, score: 0, students: 0, studentIds: [] },
          ...without,
        ].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
      })
      if (created.name.trim().toLowerCase() !== typedName.toLowerCase()) {
        setMessage(`Opened existing skill “${created.name}”.`)
      } else {
        setMessage(`“${created.name}” created in Skill Master and added to Tech Stack Readiness.`)
      }
      void load()
    } catch (e) {
      const message =
        e instanceof Error
          ? e.message
          : e && typeof e === 'object' && 'message' in e
            ? String((e as { message: unknown }).message)
            : 'Failed to create skill'
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  const handleToggleSkill = async (skillId: string, isActive: boolean) => {
    setSaving(true)
    setError(null)
    try {
      await updateTechSkill(skillId, { isActive })
      setMessage(isActive ? 'Skill activated.' : 'Skill deactivated.')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update skill')
    } finally {
      setSaving(false)
    }
  }

  const needle = search.trim().toLowerCase()
  const filteredSkills = needle
    ? skills.filter(
        (skill) =>
          skill.name.toLowerCase().includes(needle) ||
          skill.category.toLowerCase().includes(needle),
      )
    : skills
  const filteredReadiness = needle
    ? techReadiness.filter((row) => row.name.toLowerCase().includes(needle))
    : techReadiness

  return (
    <PlacementShell title="Tech Stack">
      <PlacementPageHeader
        title="Tech Stack Dashboard"
        description="Year-filtered coding language readiness, badges, and skill master catalog."
      />
      <TechStackModuleNav />

      {!canView ? (
        <PlacementEmptyState
          title="No tech stack access"
          description="This module is available to Super Admin, TPO/Admin, and Faculty/Trainer only."
        />
      ) : (
        <PlacementPageStack>
          <PlacementAlerts error={error} success={message} />
          <PassOutYearFilterBar value={year} onChange={setYear} />

          <PlacementPageBody loading={loading} loadingLabel="Loading tech stack…">
            <div className="space-y-6">
              <PlacementFilterCard>
                <PlacementField label="Search" hint="Filter chart labels and skill master">
                  <Input
                    placeholder="Search skill name or category"
                    className="border-border bg-card"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </PlacementField>
              </PlacementFilterCard>

              <PlacementSectionCard
                title="Tech Stack Readiness"
                description="Coding languages / skills for the selected pass-out year."
              >
                {filteredReadiness.length ? (
                  <TechReadinessRadialChart data={filteredReadiness} />
                ) : (
                  <PlacementEmptyState
                    title="No tech readiness data yet"
                    description="Evaluate students or assign skills to populate this chart."
                  />
                )}
              </PlacementSectionCard>

              {stats ? (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:items-stretch">
                  {TECH_STACK_BADGE_ORDER.map((badge) => {
                    const count = stats.badgeCounts[badge]
                    const percent = stats.badgePercents[badge]
                    const data = [
                      {
                        name: TECH_STACK_BADGE_LABELS[badge],
                        value: count,
                        color: BADGE_CHART_COLORS[badge],
                      },
                      {
                        name: 'Others',
                        value: Math.max(0, stats.filteredTotal - count),
                        color: 'rgba(146, 154, 165, 0.25)',
                      },
                    ]
                    return (
                      <LuxuryDonutChart
                        key={badge}
                        className="h-full"
                        title={`${TECH_STACK_BADGE_EMOJI[badge]} ${TECH_STACK_BADGE_LABELS[badge]}`}
                        subtitle={`${count} Students · ${percent}% of cohort`}
                        data={data}
                        height={220}
                        hideLegend
                        centerValue={`${percent}%`}
                        centerLabel={`${count} Students`}
                      />
                    )
                  })}
                </div>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <PlacementStatCard label="Students with tech stack" value={stats?.studentsWithTechStack ?? 0} />
                <PlacementStatCard
                  label="Avg verified skills"
                  value={stats?.averageVerifiedSkillsPerStudent ?? 0}
                />
                <PlacementStatCard
                  label="Top skill"
                  value={stats?.topSkills[0]?.skill ?? '—'}
                  hint={stats?.topSkills[0] ? `${stats.topSkills[0].studentCount} students` : undefined}
                />
                <PlacementStatCard
                  label="Top category"
                  value={
                    stats?.categoryDistribution[0]?.category
                      ? formatEnumLabel(stats.categoryDistribution[0].category)
                      : '—'
                  }
                />
              </div>

              {stats ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  <LuxuryDonutChart
                    title="Category distribution"
                    subtitle="Students represented per skill category"
                    data={(stats.categoryDistribution ?? []).map((row) => ({
                      name: formatEnumLabel(row.category),
                      value: row.studentCount,
                    }))}
                    centerLabel="With stack"
                    centerValue={stats.studentsWithTechStack}
                  />
                  <LuxuryBarChart
                    title="Top skills"
                    subtitle="Most popular declared skills"
                    data={(stats.topSkills ?? []).map((row) => ({
                      name: row.skill,
                      value: row.studentCount,
                    }))}
                    layout="horizontal"
                    height={300}
                  />
                </div>
              ) : null}

              <PlacementSectionCard
                title="Skill master"
                description={
                  canManageMaster
                    ? 'Canonical coding languages and subjects used in Evaluate.'
                    : 'Catalog of coding languages available for evaluation.'
                }
                actions={<span className="font-mono text-xs text-muted-foreground">{filteredSkills.length} skills</span>}
              >
                {canManageMaster ? (
                  <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_220px_auto]">
                    <PlacementField label="Skill / language name">
                      <Input
                        className="border-border bg-card"
                        placeholder="e.g. Python"
                        value={masterForm.name}
                        onChange={(e) => setMasterForm((form) => ({ ...form, name: e.target.value }))}
                      />
                    </PlacementField>
                    <PlacementField label="Category">
                      <PlacementSelect
                        value={masterForm.category}
                        onChange={(value) =>
                          setMasterForm((form) => ({ ...form, category: value as SkillCategory }))
                        }
                      >
                        {SKILL_CATEGORIES.map((category) => (
                          <option key={category} value={category}>
                            {formatEnumLabel(category)}
                          </option>
                        ))}
                      </PlacementSelect>
                    </PlacementField>
                    <div className="flex items-end">
                      <Button
                        size="sm"
                        disabled={saving || !masterForm.name.trim()}
                        onClick={() => void handleCreateSkill()}
                      >
                        {saving ? 'Saving…' : 'Create skill'}
                      </Button>
                    </div>
                  </div>
                ) : null}

                <div className="grid gap-2 sm:grid-cols-2">
                  {filteredSkills.map((skill) => (
                    <div
                      key={skill.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-background/30 px-3 py-2"
                    >
                      <div>
                        <p className="font-medium text-foreground">{skill.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatEnumLabel(skill.category)} · {skill.is_active ? 'Active' : 'Inactive'}
                        </p>
                      </div>
                      {canManageMaster ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={saving}
                          onClick={() => void handleToggleSkill(skill.id, !skill.is_active)}
                        >
                          {skill.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                      ) : null}
                    </div>
                  ))}
                  {!filteredSkills.length ? (
                    <p className="col-span-full py-8 text-center text-sm text-muted-foreground">
                      No skills match this search.
                    </p>
                  ) : null}
                </div>
              </PlacementSectionCard>
            </div>
          </PlacementPageBody>
        </PlacementPageStack>
      )}
    </PlacementShell>
  )
}
