import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PlacementLink } from '@/components/placement/PlacementLink'
import { PlacementShell, usePlacementPaths } from '@/components/placement/PlacementShell'
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
  PlacementTableCard,
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
  DEFAULT_ROLE_INTERESTS,
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

export function TechStackPage() {
  const { base } = usePlacementPaths()
  const { placementRole } = useAuth()
  const canView = canViewTechStack(placementRole)
  const canManageMaster = canManageSkillMaster(placementRole)
  const [skills, setSkills] = useState<Awaited<ReturnType<typeof listTechSkills>>>([])
  const [rows, setRows] = useState<TechStackStudentRow[]>([])
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getTechStackDashboardStats>> | null>(null)
  const [filters, setFilters] = useState<TechStackFilters>({})
  const [draft, setDraft] = useState<TechStackFilters>({})
  const [masterForm, setMasterForm] = useState({ name: '', category: 'OTHER' as SkillCategory })
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
    setFilters({
      q: draft.q || undefined,
      branch: draft.branch || undefined,
      batch: draft.batch || undefined,
      skillId: draft.skillId || undefined,
      category: draft.category || undefined,
      proficiencyLevel: draft.proficiencyLevel || undefined,
      verificationStatus: draft.verificationStatus || undefined,
      roleInterest: draft.roleInterest || undefined,
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
                    <PlacementSelect value={draft.skillId ?? ''} onChange={(value) => setDraft((d) => ({ ...d, skillId: value }))}>
                      <option value="">All skills</option>
                      {skills.filter((skill) => skill.is_active).map((skill) => <option key={skill.id} value={skill.id}>{skill.name}</option>)}
                    </PlacementSelect>
                  </PlacementField>
                  <PlacementField label="Category">
                    <PlacementSelect value={draft.category ?? ''} onChange={(value) => setDraft((d) => ({ ...d, category: value }))}>
                      <option value="">All categories</option>
                      {SKILL_CATEGORIES.map((category) => <option key={category} value={category}>{formatEnumLabel(category)}</option>)}
                    </PlacementSelect>
                  </PlacementField>
                  <PlacementField label="Proficiency">
                    <PlacementSelect value={draft.proficiencyLevel ?? ''} onChange={(value) => setDraft((d) => ({ ...d, proficiencyLevel: value }))}>
                      <option value="">All proficiency levels</option>
                      {PROFICIENCY_LEVELS.map((level) => <option key={level} value={level}>{formatEnumLabel(level)}</option>)}
                    </PlacementSelect>
                  </PlacementField>
                  <PlacementField label="Verification">
                    <PlacementSelect value={draft.verificationStatus ?? ''} onChange={(value) => setDraft((d) => ({ ...d, verificationStatus: value }))}>
                      <option value="">All verification statuses</option>
                      {VERIFICATION_STATUSES.map((status) => <option key={status} value={status}>{formatEnumLabel(status)}</option>)}
                    </PlacementSelect>
                  </PlacementField>
                  <PlacementField label="Role interest">
                    <PlacementSelect value={draft.roleInterest ?? ''} onChange={(value) => setDraft((d) => ({ ...d, roleInterest: value }))}>
                      <option value="">All role interests</option>
                      {DEFAULT_ROLE_INTERESTS.map((role) => <option key={role} value={role}>{role}</option>)}
                    </PlacementSelect>
                  </PlacementField>
                  <div className="flex items-end gap-2 sm:col-span-2">
                    <Button type="submit" size="sm">Apply filters</Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => { setDraft({}); setFilters({}) }}>Clear</Button>
                  </div>
                </form>
              </PlacementFilterCard>

              {rows.length ? (
                <PlacementTableCard title="Student-wise tracking" count={rows.length}>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30 hover:bg-muted/40">
                        <TableHead>Student</TableHead>
                        <TableHead>Roll number</TableHead>
                        <TableHead>Branch</TableHead>
                        <TableHead>Batch</TableHead>
                        <TableHead>Skills</TableHead>
                        <TableHead>Top skills</TableHead>
                        <TableHead>Verified</TableHead>
                        <TableHead>Role interests</TableHead>
                        <TableHead>Last updated</TableHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((row) => (
                        <TableRow key={row.student.id} className="hover:bg-muted/40">
                          <TableCell className="font-medium">{row.student.full_name}</TableCell>
                          <TableCell>{row.student.roll_number}</TableCell>
                          <TableCell>{row.student.branch || '—'}</TableCell>
                          <TableCell>{row.student.batch || '—'}</TableCell>
                          <TableCell>{row.skillsCount}</TableCell>
                          <TableCell>
                            <div className="flex max-w-xs flex-wrap gap-1">
                              {row.topSkills.length ? row.topSkills.map((skill) => <Badge key={skill} variant="outline" className="font-mono text-[10px]">{skill}</Badge>) : '—'}
                            </div>
                          </TableCell>
                          <TableCell>{row.verifiedSkillsCount}</TableCell>
                          <TableCell>
                            <div className="max-w-xs text-xs text-muted-foreground">
                              {row.roleInterests.map((interest) => interest.role_name).join(', ') || '—'}
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                            {row.lastUpdated ? new Date(row.lastUpdated).toLocaleDateString() : '—'}
                          </TableCell>
                          <TableCell>
                            {base ? (
                              <Button asChild size="sm" variant="outline">
                                <PlacementLink href={`${base}/students/$id`} params={{ id: row.student.id }}>View</PlacementLink>
                              </Button>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </PlacementTableCard>
              ) : (
                <PlacementEmptyState title="No students match filters" description="Clear filters or add tech stack data to student profiles." />
              )}

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
            </div>
          </PlacementPageBody>
        </PlacementPageStack>
      )}
    </PlacementShell>
  )
}
