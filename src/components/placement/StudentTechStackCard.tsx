import { useCallback, useEffect, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PlacementEmptyState, PlacementErrorAlert, PlacementLoadingBlock } from '@/components/placement/PlacementStates'
import { useAuth } from '@/hooks/useAuth'
import {
  DEFAULT_ROLE_INTERESTS,
  INTEREST_LEVELS,
  PROFICIENCY_LEVELS,
  READINESS_LEVELS,
  VERIFICATION_STATUSES,
  addStudentSkill,
  isVerifiedSkill,
  listStudentRoleInterests,
  listStudentSkills,
  listTechSkills,
  removeRoleInterest,
  removeStudentSkill,
  updateStudentSkill,
  upsertRoleInterest,
  verifyStudentSkill,
  type InterestLevel,
  type ProficiencyLevel,
  type ReadinessLevel,
  type StudentRoleInterestRow,
  type StudentTechSkillWithMeta,
  type TechSkillRow,
  type VerificationStatus,
} from '@/api/placement/techSkills'
import { canManageSkillMaster, canManageStudentTechStack, canVerifyTechSkills } from '@/lib/placementPermissions'
import { cn } from '@/lib/utils'

interface StudentTechStackCardProps {
  studentProfileId: string
  onChanged?: () => void
}

function pretty(value: string) {
  return value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase())
}

function BadgeTone({ children, tone = 'muted' }: { children: React.ReactNode; tone?: 'green' | 'blue' | 'amber' | 'muted' }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'font-mono text-[10px]',
        tone === 'green' && 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
        tone === 'blue' && 'border-blue-500/30 bg-blue-500/10 text-blue-300',
        tone === 'amber' && 'border-[#D27918]/35 bg-[#D27918]/10 text-[#E08A2A]',
        tone === 'muted' && 'border-border text-muted-foreground',
      )}
    >
      {children}
    </Badge>
  )
}

function proficiencyTone(level: string): 'green' | 'blue' | 'amber' | 'muted' {
  if (level === 'ADVANCED') return 'green'
  if (level === 'INTERMEDIATE') return 'blue'
  if (level === 'BEGINNER') return 'amber'
  return 'muted'
}

function verificationTone(status: string): 'green' | 'blue' | 'amber' | 'muted' {
  if (isVerifiedSkill(status)) return 'green'
  if (status === 'RESUME_EVIDENCE' || status === 'GITHUB_EVIDENCE') return 'blue'
  if (status === 'SELF_DECLARED') return 'amber'
  return 'muted'
}

export function StudentTechStackCard({ studentProfileId, onChanged }: StudentTechStackCardProps) {
  const { placementRole } = useAuth()
  const canManage = canManageStudentTechStack(placementRole)
  const canVerify = canVerifyTechSkills(placementRole)
  const [skills, setSkills] = useState<StudentTechSkillWithMeta[]>([])
  const [catalog, setCatalog] = useState<TechSkillRow[]>([])
  const [roles, setRoles] = useState<StudentRoleInterestRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [skillForm, setSkillForm] = useState({
    techSkillId: '',
    proficiencyLevel: 'BEGINNER' as ProficiencyLevel,
    verificationStatus: 'SELF_DECLARED' as VerificationStatus,
    evidenceSource: '',
    notes: '',
  })
  const [roleForm, setRoleForm] = useState<{
    roleName: string
    interestLevel: InterestLevel
    readinessLevel: ReadinessLevel
    notes: string
  }>({
    roleName: DEFAULT_ROLE_INTERESTS[0],
    interestLevel: 'MEDIUM' as InterestLevel,
    readinessLevel: 'LEARNING' as ReadinessLevel,
    notes: '',
  })

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [skillRows, skillCatalog, roleRows] = await Promise.all([
        listStudentSkills(studentProfileId),
        listTechSkills(),
        listStudentRoleInterests(studentProfileId),
      ])
      setSkills(skillRows)
      setCatalog(skillCatalog)
      setRoles(roleRows)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load tech stack')
    } finally {
      setLoading(false)
    }
  }, [studentProfileId])

  useEffect(() => {
    void load()
  }, [load])

  const groupedSkills = useMemo(() => {
    const groups = new Map<string, StudentTechSkillWithMeta[]>()
    for (const row of skills) {
      const category = row.tech_skill?.category ?? 'OTHER'
      const list = groups.get(category) ?? []
      list.push(row)
      groups.set(category, list)
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [skills])

  const refreshAfterChange = async (success: string) => {
    setMessage(success)
    await load()
    onChanged?.()
  }

  const handleAddSkill = async () => {
    if (!skillForm.techSkillId) return
    setSaving(true)
    setError(null)
    try {
      await addStudentSkill(studentProfileId, skillForm)
      setSkillForm((form) => ({ ...form, techSkillId: '', notes: '', evidenceSource: '' }))
      await refreshAfterChange('Skill saved.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save skill')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateSkill = async (row: StudentTechSkillWithMeta, patch: Partial<typeof skillForm>) => {
    setSaving(true)
    setError(null)
    try {
      await updateStudentSkill(row.id, patch)
      await refreshAfterChange('Skill updated.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update skill')
    } finally {
      setSaving(false)
    }
  }

  const handleVerifySkill = async (row: StudentTechSkillWithMeta) => {
    setSaving(true)
    setError(null)
    try {
      await verifyStudentSkill(row.id)
      await refreshAfterChange('Skill verified.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to verify skill')
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveSkill = async (row: StudentTechSkillWithMeta) => {
    if (!window.confirm(`Remove ${row.tech_skill?.name ?? 'this skill'}?`)) return
    setSaving(true)
    setError(null)
    try {
      await removeStudentSkill(row.id)
      await refreshAfterChange('Skill removed.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to remove skill')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveRole = async () => {
    setSaving(true)
    setError(null)
    try {
      await upsertRoleInterest(studentProfileId, roleForm)
      setRoleForm({ roleName: DEFAULT_ROLE_INTERESTS[0], interestLevel: 'MEDIUM', readinessLevel: 'LEARNING', notes: '' })
      await refreshAfterChange('Role interest saved.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save role interest')
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveRole = async (role: StudentRoleInterestRow) => {
    if (!window.confirm(`Remove ${role.role_name}?`)) return
    setSaving(true)
    setError(null)
    try {
      await removeRoleInterest(role.id)
      await refreshAfterChange('Role interest removed.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to remove role interest')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <PlacementLoadingBlock />

  return (
    <div className="space-y-6">
      {error ? <PlacementErrorAlert message={error} /> : null}
      {message ? (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 font-mono text-xs text-emerald-300">
          {message}
        </div>
      ) : null}

      <Card className="term-window border-border bg-card/80">
        <CardHeader className="border-b border-border">
          <CardTitle className="text-base">Tech stack</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 pt-4">
          {groupedSkills.length ? (
            groupedSkills.map(([category, rows]) => (
              <section key={category}>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{pretty(category)}</h3>
                  <BadgeTone>{rows.length} skill{rows.length === 1 ? '' : 's'}</BadgeTone>
                </div>
                <div className="grid gap-3">
                  {rows.map((row) => (
                    <div key={row.id} className="rounded-lg border border-border bg-background/30 p-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-foreground">{row.tech_skill?.name ?? row.tech_skill_id}</p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            <BadgeTone tone={proficiencyTone(row.proficiency_level)}>{pretty(row.proficiency_level)}</BadgeTone>
                            <BadgeTone tone={verificationTone(row.verification_status)}>{pretty(row.verification_status)}</BadgeTone>
                            {row.evidence_source ? <BadgeTone tone="blue">{row.evidence_source}</BadgeTone> : null}
                          </div>
                        </div>
                        {canManage ? (
                          <div className="flex flex-wrap gap-1.5">
                            {canVerify ? (
                              <Button size="sm" variant="outline" disabled={saving || isVerifiedSkill(row.verification_status)} onClick={() => void handleVerifySkill(row)}>
                                Verify
                              </Button>
                            ) : null}
                            <Button size="sm" variant="outline" disabled={saving} onClick={() => void handleRemoveSkill(row)}>
                              Remove
                            </Button>
                          </div>
                        ) : null}
                      </div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-3">
                        <select
                          className="h-8 rounded-lg border border-border bg-card px-2 text-xs"
                          value={row.proficiency_level}
                          disabled={!canManage || saving}
                          onChange={(e) => void handleUpdateSkill(row, { proficiencyLevel: e.target.value as ProficiencyLevel })}
                        >
                          {PROFICIENCY_LEVELS.map((level) => <option key={level} value={level}>{pretty(level)}</option>)}
                        </select>
                        <select
                          className="h-8 rounded-lg border border-border bg-card px-2 text-xs"
                          value={row.verification_status}
                          disabled={!canVerify || saving}
                          onChange={(e) => void handleUpdateSkill(row, { verificationStatus: e.target.value as VerificationStatus })}
                        >
                          {VERIFICATION_STATUSES.map((status) => <option key={status} value={status}>{pretty(status)}</option>)}
                        </select>
                        <Input
                          className="h-8 border-border bg-card text-xs"
                          value={row.evidence_source}
                          disabled={!canManage || saving}
                          placeholder="Evidence source"
                          onChange={(e) => void handleUpdateSkill(row, { evidenceSource: e.target.value })}
                        />
                      </div>
                      <textarea
                        className="mt-2 min-h-16 w-full rounded-lg border border-border bg-card px-3 py-2 text-xs"
                        value={row.notes}
                        disabled={!canManage || saving}
                        placeholder="Notes"
                        onChange={(e) => void handleUpdateSkill(row, { notes: e.target.value })}
                      />
                      <p className="mt-2 text-[11px] text-muted-foreground">
                        Added by {row.added_by?.full_name ?? '—'}
                        {row.verified_by ? ` · Verified by ${row.verified_by.full_name}` : ''}
                        {row.verified_at ? ` · ${new Date(row.verified_at).toLocaleDateString()}` : ''}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            ))
          ) : (
            <PlacementEmptyState title="No skills added" description="Add technologies the student knows, then track proficiency and verification." />
          )}

          {canManage ? (
            <div className="rounded-lg border border-border bg-background/30 p-3">
              <h3 className="mb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Add skill</h3>
              <div className="grid gap-2 md:grid-cols-2">
                <select className="h-8 rounded-lg border border-border bg-card px-2 text-sm" value={skillForm.techSkillId} onChange={(e) => setSkillForm((form) => ({ ...form, techSkillId: e.target.value }))}>
                  <option value="">Select skill</option>
                  {catalog.map((skill) => <option key={skill.id} value={skill.id}>{skill.name} · {pretty(skill.category)}</option>)}
                </select>
                <select className="h-8 rounded-lg border border-border bg-card px-2 text-sm" value={skillForm.proficiencyLevel} onChange={(e) => setSkillForm((form) => ({ ...form, proficiencyLevel: e.target.value as ProficiencyLevel }))}>
                  {PROFICIENCY_LEVELS.map((level) => <option key={level} value={level}>{pretty(level)}</option>)}
                </select>
                <select className="h-8 rounded-lg border border-border bg-card px-2 text-sm" value={skillForm.verificationStatus} onChange={(e) => setSkillForm((form) => ({ ...form, verificationStatus: e.target.value as VerificationStatus }))}>
                  {VERIFICATION_STATUSES.map((status) => <option key={status} value={status}>{pretty(status)}</option>)}
                </select>
                <Input className="h-8 border-border bg-card" placeholder="Evidence source" value={skillForm.evidenceSource} onChange={(e) => setSkillForm((form) => ({ ...form, evidenceSource: e.target.value }))} />
                <textarea className="min-h-16 rounded-lg border border-border bg-card px-3 py-2 text-sm md:col-span-2" placeholder="Notes" value={skillForm.notes} onChange={(e) => setSkillForm((form) => ({ ...form, notes: e.target.value }))} />
                <Button size="sm" className="md:w-fit" disabled={saving || !skillForm.techSkillId} onClick={() => void handleAddSkill()}>
                  {saving ? 'Saving…' : 'Add skill'}
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="term-window border-border bg-card/80">
        <CardHeader className="border-b border-border">
          <CardTitle className="text-base">Role interests</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          {roles.length ? (
            <div className="grid gap-3">
              {roles.map((role) => (
                <div key={role.id} className="rounded-lg border border-border bg-background/30 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">{role.role_name}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <BadgeTone tone={role.interest_level === 'HIGH' ? 'green' : role.interest_level === 'MEDIUM' ? 'blue' : 'muted'}>{pretty(role.interest_level)} interest</BadgeTone>
                        <BadgeTone tone={role.readiness_level === 'READY' ? 'green' : role.readiness_level === 'NEAR_READY' ? 'blue' : 'amber'}>{pretty(role.readiness_level)}</BadgeTone>
                      </div>
                    </div>
                    {canManage ? (
                      <Button size="sm" variant="outline" disabled={saving} onClick={() => void handleRemoveRole(role)}>
                        Remove
                      </Button>
                    ) : null}
                  </div>
                  {role.notes ? <p className="mt-2 text-sm text-muted-foreground">{role.notes}</p> : null}
                </div>
              ))}
            </div>
          ) : (
            <PlacementEmptyState title="No role interests" description="Track the roles this student is preparing for." />
          )}

          {canManage ? (
            <div className="rounded-lg border border-border bg-background/30 p-3">
              <h3 className="mb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Add role interest</h3>
              <div className="grid gap-2 md:grid-cols-3">
                <select className="h-8 rounded-lg border border-border bg-card px-2 text-sm" value={roleForm.roleName} onChange={(e) => setRoleForm((form) => ({ ...form, roleName: e.target.value }))}>
                  {DEFAULT_ROLE_INTERESTS.map((role) => <option key={role} value={role}>{role}</option>)}
                </select>
                <select className="h-8 rounded-lg border border-border bg-card px-2 text-sm" value={roleForm.interestLevel} onChange={(e) => setRoleForm((form) => ({ ...form, interestLevel: e.target.value as InterestLevel }))}>
                  {INTEREST_LEVELS.map((level) => <option key={level} value={level}>{pretty(level)}</option>)}
                </select>
                <select className="h-8 rounded-lg border border-border bg-card px-2 text-sm" value={roleForm.readinessLevel} onChange={(e) => setRoleForm((form) => ({ ...form, readinessLevel: e.target.value as ReadinessLevel }))}>
                  {READINESS_LEVELS.map((level) => <option key={level} value={level}>{pretty(level)}</option>)}
                </select>
                <textarea className="min-h-16 rounded-lg border border-border bg-card px-3 py-2 text-sm md:col-span-3" placeholder="Notes" value={roleForm.notes} onChange={(e) => setRoleForm((form) => ({ ...form, notes: e.target.value }))} />
                <Button size="sm" className="md:w-fit" disabled={saving || !roleForm.roleName} onClick={() => void handleSaveRole()}>
                  {saving ? 'Saving…' : 'Save role'}
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {!canManageSkillMaster(placementRole) ? (
        <p className="text-xs text-muted-foreground">Faculty can update student skills and verification, but skill master management is restricted to Admin/TPO.</p>
      ) : null}
    </div>
  )
}
