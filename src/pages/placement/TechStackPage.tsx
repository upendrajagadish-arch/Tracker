import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PlacementShell } from '@/components/placement/PlacementShell'
import { PlacementPageHeader } from '@/components/placement/PlacementPageHeader'
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
import {
  TECH_STACK_BADGE_EMOJI,
  TECH_STACK_BADGE_LABELS,
  TECH_STACK_BADGE_ORDER,
} from '@/lib/techStackBadge'
import {
  PROFICIENCY_LEVELS,
  SKILL_CATEGORIES,
  VERIFICATION_STATUSES,
  createTechSkill,
  getTechStackDashboardStats,
  listTechSkills,
  listTechStackStudents,
  updateTechSkill,
  type SkillCategory,
  type TechStackFilters,
  type TechStackStudentRow,
} from '@/api/placement/techSkills'
import { useAuth } from '@/hooks/useAuth'
import { canManageSkillMaster, canViewTechStack } from '@/lib/placementPermissions'

function resolveFilterValue(value: string | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

export function TechStackPage() {
  const { placementRole } = useAuth()
  const canView = canViewTechStack(placementRole)
  const canManageMaster = canManageSkillMaster(placementRole)
  const [skills, setSkills] = useState<Awaited<ReturnType<typeof listTechSkills>>>([])
  const [rows, setRows] = useState<TechStackStudentRow[]>([])
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getTechStackDashboardStats>> | null>(null)
  const [filters, setFilters] = useState<TechStackFilters>({})
  const [draft, setDraft] = useState<TechStackFilters>({})
  const [masterForm, setMasterForm] = useState({ name: '', category: 'OTHER' as SkillCategory })
  const [activeTab, setActiveTab] = useState<'dashboard' | 'students' | 'skill-master'>('dashboard')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!canView) return
    setLoading(true)
    setError(null)
    try {
      const [catalog, studentRows, dashboardStats] = await Promise.all([
        listTechSkills(false),
        listTechStackStudents(filters),
        getTechStackDashboardStats(),
      ])
      setSkills(catalog)
      setRows(studentRows)
      setStats(dashboardStats)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load tech stack data')
    } finally {
      setLoading(false)
    }
  }, [canView, filters])

  useEffect(() => {
    void load()
  }, [load])

  const applyFilters = (e: React.FormEvent) => {
    e.preventDefault()

    const resolvedSkillId = resolveFilterValue(draft.skillId)
      ? skills.find((skill) => skill.is_active && skill.name.toLowerCase().includes(resolveFilterValue(draft.skillId)!.toLowerCase()))?.id
      : undefined

    const normalizedCategory = resolveFilterValue(draft.category)?.toUpperCase()
    const normalizedProficiency = resolveFilterValue(draft.proficiencyLevel)?.toUpperCase()
    const normalizedVerification = resolveFilterValue(draft.verificationStatus)?.toUpperCase()

    setFilters({
      q: resolveFilterValue(draft.q),
      branch: resolveFilterValue(draft.branch),
      batch: resolveFilterValue(draft.batch),
      skillId: resolvedSkillId,
      category: normalizedCategory && (SKILL_CATEGORIES as readonly string[]).includes(normalizedCategory)
        ? (normalizedCategory as SkillCategory)
        : undefined,
      proficiencyLevel: normalizedProficiency && (PROFICIENCY_LEVELS as readonly string[]).includes(normalizedProficiency)
        ? normalizedProficiency
        : undefined,
      verificationStatus: normalizedVerification && (VERIFICATION_STATUSES as readonly string[]).includes(normalizedVerification)
        ? normalizedVerification
        : undefined,
      roleInterest: resolveFilterValue(draft.roleInterest),
    })
  }

  const handleCreateSkill = async () => {
    if (!masterForm.name.trim()) return
    setSaving(true)
    setError(null)
    try {
      await createTechSkill(masterForm)
      setMasterForm({ name: '', category: 'OTHER' })
      setMessage('Skill master created.')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create skill')
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

  const averageCgpa = rows.length
    ? (rows.reduce((sum, row) => sum + Number(row.student.cgpa ?? 0), 0) / rows.length).toFixed(2)
    : '—'
  const eligibleStudents = rows.filter((row) => row.student.is_placement_eligible).length

  return (
    <PlacementShell title="Tech Stack">
      <PlacementPageHeader
        title="Tech Stack Tracking"
        description="Catalog skills and track student proficiency levels."
      />

      {!canView ? (
        <PlacementEmptyState title="No tech stack access" description="This module is available to Super Admin, TPO/Admin, and Faculty/Trainer only." />
      ) : (
        <PlacementPageStack>
          <PlacementAlerts error={error} success={message} />

          <PlacementPageBody loading={loading} loadingLabel="Loading tech stack…">
            <div className="space-y-6">
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
                <PlacementStatCard label="Avg verified skills" value={stats?.averageVerifiedSkillsPerStudent ?? 0} />
                <PlacementStatCard label="Top skill" value={stats?.topSkills[0]?.skill ?? '—'} hint={stats?.topSkills[0] ? `${stats.topSkills[0].studentCount} students` : undefined} />
                <PlacementStatCard label="Top category" value={stats?.categoryDistribution[0]?.category ? formatEnumLabel(stats.categoryDistribution[0].category) : '—'} />
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

              <div className="mb-4 flex w-full max-w-full gap-1 overflow-x-auto rounded-card border border-soft bg-elevated p-1">
                {[
                  { id: 'skill-master', label: 'Skill Master' },
                  { id: 'dashboard', label: 'Dashboard' },
                  { id: 'students', label: 'Students' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as typeof activeTab)}
                    className={`shrink-0 rounded-md px-3 py-2 text-sm font-semibold transition ${activeTab === tab.id ? 'bg-card text-binance' : 'text-secondary hover:text-foreground'}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {activeTab === 'dashboard' ? (
                <div className="space-y-6">
                  <PlacementFilterCard>
                    <form onSubmit={applyFilters} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <PlacementField label="Search" hint="Student name or roll number">
                        <Input placeholder="e.g. CS21B1001" className="border-border bg-card" value={draft.q ?? ''} onChange={(e) => setDraft((d) => ({ ...d, q: e.target.value }))} />
                      </PlacementField>
                      <PlacementField label="Branch">
                        <Input placeholder="e.g. CSE" className="border-border bg-card" value={draft.branch ?? ''} onChange={(e) => setDraft((d) => ({ ...d, branch: e.target.value }))} />
                      </PlacementField>
                      <PlacementField label="Batch">
                        <Input placeholder="e.g. 2026" className="border-border bg-card" value={draft.batch ?? ''} onChange={(e) => setDraft((d) => ({ ...d, batch: e.target.value }))} />
                      </PlacementField>
                      <PlacementField label="Skill">
                        <Input placeholder="e.g. React" className="border-border bg-card" value={draft.skillId ?? ''} onChange={(e) => setDraft((d) => ({ ...d, skillId: e.target.value }))} />
                      </PlacementField>
                      <PlacementField label="Category">
                        <Input placeholder="e.g. WEB_TECHNOLOGY" className="border-border bg-card" value={draft.category ?? ''} onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))} />
                      </PlacementField>
                      <PlacementField label="Proficiency">
                        <Input placeholder="e.g. ADVANCED" className="border-border bg-card" value={draft.proficiencyLevel ?? ''} onChange={(e) => setDraft((d) => ({ ...d, proficiencyLevel: e.target.value }))} />
                      </PlacementField>
                      <PlacementField label="Verification">
                        <Input placeholder="e.g. FACULTY_VERIFIED" className="border-border bg-card" value={draft.verificationStatus ?? ''} onChange={(e) => setDraft((d) => ({ ...d, verificationStatus: e.target.value }))} />
                      </PlacementField>
                      <PlacementField label="Role interest">
                        <Input placeholder="e.g. Web Developer" className="border-border bg-card" value={draft.roleInterest ?? ''} onChange={(e) => setDraft((d) => ({ ...d, roleInterest: e.target.value }))} />
                      </PlacementField>
                      <div className="flex items-end gap-2 sm:col-span-2">
                        <Button type="submit" size="sm">Apply filters</Button>
                        <Button type="button" size="sm" variant="outline" onClick={() => { setDraft({}); setFilters({}) }}>Clear</Button>
                      </div>
                    </form>
                  </PlacementFilterCard>
                </div>
              ) : null}

              {activeTab === 'students' ? (
                <div className="space-y-4">
                  <PlacementFilterCard>
                    <form onSubmit={applyFilters} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <PlacementField label="Search" hint="Student name or roll number">
                        <Input placeholder="e.g. CS21B1001" className="border-border bg-card" value={draft.q ?? ''} onChange={(e) => setDraft((d) => ({ ...d, q: e.target.value }))} />
                      </PlacementField>
                      <PlacementField label="Branch">
                        <Input placeholder="e.g. CSE" className="border-border bg-card" value={draft.branch ?? ''} onChange={(e) => setDraft((d) => ({ ...d, branch: e.target.value }))} />
                      </PlacementField>
                      <PlacementField label="Batch">
                        <Input placeholder="e.g. 2026" className="border-border bg-card" value={draft.batch ?? ''} onChange={(e) => setDraft((d) => ({ ...d, batch: e.target.value }))} />
                      </PlacementField>
                      <PlacementField label="Skill">
                        <Input placeholder="e.g. React" className="border-border bg-card" value={draft.skillId ?? ''} onChange={(e) => setDraft((d) => ({ ...d, skillId: e.target.value }))} />
                      </PlacementField>
                      <PlacementField label="Category">
                        <Input placeholder="e.g. WEB_TECHNOLOGY" className="border-border bg-card" value={draft.category ?? ''} onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))} />
                      </PlacementField>
                      <PlacementField label="Proficiency">
                        <Input placeholder="e.g. ADVANCED" className="border-border bg-card" value={draft.proficiencyLevel ?? ''} onChange={(e) => setDraft((d) => ({ ...d, proficiencyLevel: e.target.value }))} />
                      </PlacementField>
                      <PlacementField label="Verification">
                        <Input placeholder="e.g. FACULTY_VERIFIED" className="border-border bg-card" value={draft.verificationStatus ?? ''} onChange={(e) => setDraft((d) => ({ ...d, verificationStatus: e.target.value }))} />
                      </PlacementField>
                      <PlacementField label="Role interest">
                        <Input placeholder="e.g. Web Developer" className="border-border bg-card" value={draft.roleInterest ?? ''} onChange={(e) => setDraft((d) => ({ ...d, roleInterest: e.target.value }))} />
                      </PlacementField>
                      <div className="flex items-end gap-2 sm:col-span-2">
                        <Button type="submit" size="sm">Apply filters</Button>
                        <Button type="button" size="sm" variant="outline" onClick={() => { setDraft({}); setFilters({}) }}>Clear</Button>
                      </div>
                    </form>
                  </PlacementFilterCard>

                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <PlacementStatCard label="Visible students" value={rows.length} />
                    <PlacementStatCard label="Verified skills" value={rows.reduce((sum, row) => sum + row.verifiedSkillsCount, 0)} />
                    <PlacementStatCard label="Avg CGPA" value={averageCgpa} hint="Filtered cohort" />
                    <PlacementStatCard label="Eligible students" value={eligibleStudents} hint="Placement eligible" />
                  </div>

                  {rows.length ? (
                    <PlacementSectionCard title="Filtered cohort snapshot" description="The student-wise table is now consolidated into this concise view.">
                      <div className="flex flex-wrap gap-2">
                        {rows.slice(0, 12).map((row) => (
                          <div key={row.student.id} className="rounded-lg border border-border bg-background/30 px-3 py-2">
                            <p className="font-medium text-foreground">{row.student.full_name}</p>
                            <p className="text-xs text-muted-foreground">{row.student.roll_number} · {row.skillsCount} skills</p>
                          </div>
                        ))}
                      </div>
                    </PlacementSectionCard>
                  ) : (
                    <PlacementEmptyState title="No students match filters" description="Clear filters or add tech stack data to student profiles." />
                  )}
                </div>
              ) : null}

              {activeTab === 'skill-master' ? (
                <PlacementSectionCard
                  title="Skill master"
                  description={canManageMaster ? 'Create and manage the canonical skill catalog.' : 'Faculty can use existing skills but cannot create or deactivate master skills.'}
                  actions={<span className="font-mono text-xs text-muted-foreground">{skills.length} skills</span>}
                >
                  {canManageMaster ? (
                    <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_220px_auto]">
                      <PlacementField label="Skill name">
                        <Input className="border-border bg-card" placeholder="e.g. React" value={masterForm.name} onChange={(e) => setMasterForm((form) => ({ ...form, name: e.target.value }))} />
                      </PlacementField>
                      <PlacementField label="Category">
                        <PlacementSelect value={masterForm.category} onChange={(value) => setMasterForm((form) => ({ ...form, category: value as SkillCategory }))}>
                          {SKILL_CATEGORIES.map((category) => <option key={category} value={category}>{formatEnumLabel(category)}</option>)}
                        </PlacementSelect>
                      </PlacementField>
                      <div className="flex items-end">
                        <Button size="sm" disabled={saving || !masterForm.name.trim()} onClick={() => void handleCreateSkill()}>
                          {saving ? 'Saving…' : 'Create skill'}
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  <div className="grid gap-2 sm:grid-cols-2">
                    {skills.map((skill) => (
                      <div key={skill.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-background/30 px-3 py-2">
                        <div>
                          <p className="font-medium text-foreground">{skill.name}</p>
                          <p className="text-xs text-muted-foreground">{formatEnumLabel(skill.category)} · {skill.is_active ? 'Active' : 'Inactive'}</p>
                        </div>
                        {canManageMaster ? (
                          <Button size="sm" variant="outline" disabled={saving} onClick={() => void handleToggleSkill(skill.id, !skill.is_active)}>
                            {skill.is_active ? 'Deactivate' : 'Activate'}
                          </Button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </PlacementSectionCard>
              ) : null}
            </div>
          </PlacementPageBody>
        </PlacementPageStack>
      )}
    </PlacementShell>
  )
}
