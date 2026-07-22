import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PlacementLink } from '@/components/placement/PlacementLink'
import { PlacementShell, usePlacementPaths } from '@/components/placement/PlacementShell'
import { PlacementPageHeader } from '@/components/placement/PlacementPageHeader'
import { TechStackModuleNav } from '@/components/placement/TechStackModuleNav'
import { StudentTypeahead } from '@/components/placement/StudentTypeahead'
import { PlacementEmptyState } from '@/components/placement/PlacementStates'
import {
  PlacementAlerts,
  PlacementField,
  PlacementPageStack,
  PlacementSectionCard,
  PlacementSelect,
  formatEnumLabel,
} from '@/components/placement/PlacementUi'
import {
  PROFICIENCY_LEVELS,
  VERIFICATION_STATUSES,
  addStudentSkill,
  createTechSkill,
  listStudentSkills,
  listTechSkills,
  type ProficiencyLevel,
  type SkillCategory,
  type TechSkillRow,
  type VerificationStatus,
} from '@/api/placement/techSkills'
import { canManageStudentTechStack, canManageSkillMaster } from '@/lib/placementPermissions'
import { useAuth } from '@/hooks/useAuth'
import { PassOutYearFilterBar, usePassOutYearFilter } from '@/lib/placementYearFilter'

export function TechStackEvaluatePage() {
  const { placementRole } = useAuth()
  const { base } = usePlacementPaths()
  const navigate = useNavigate()
  const canEvaluate = canManageStudentTechStack(placementRole)
  const canCreateSubject = canManageSkillMaster(placementRole)
  const { year, setYear } = usePassOutYearFilter()

  const [catalog, setCatalog] = useState<TechSkillRow[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [selectedStudentLabel, setSelectedStudentLabel] = useState('')
  const [interviewerName, setInterviewerName] = useState('')
  const [techSkillId, setTechSkillId] = useState('')
  const [proficiencyLevel, setProficiencyLevel] = useState<ProficiencyLevel>('INTERMEDIATE')
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>('FACULTY_VERIFIED')
  const [notes, setNotes] = useState('')
  const [newSubjectName, setNewSubjectName] = useState('')
  const [newSubjectCategory, setNewSubjectCategory] = useState<SkillCategory>('PROGRAMMING_LANGUAGE')
  const [existingSkills, setExistingSkills] = useState<Awaited<ReturnType<typeof listStudentSkills>>>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const loadCatalog = useCallback(async () => {
    if (!canEvaluate) return
    setLoading(true)
    setError(null)
    try {
      setCatalog(await listTechSkills(true))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load evaluate form')
    } finally {
      setLoading(false)
    }
  }, [canEvaluate])

  useEffect(() => {
    void loadCatalog()
  }, [loadCatalog])

  const programmingSkills = useMemo(
    () => [...catalog].sort((a, b) => a.name.localeCompare(b.name)),
    [catalog],
  )

  useEffect(() => {
    if (!selectedStudentId) {
      setExistingSkills([])
      return
    }
    void listStudentSkills(selectedStudentId)
      .then(setExistingSkills)
      .catch(() => setExistingSkills([]))
  }, [selectedStudentId])

  const handleAddSubject = async () => {
    if (!newSubjectName.trim()) return
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const created = await createTechSkill({
        name: newSubjectName.trim(),
        category: newSubjectCategory,
      })
      setCatalog((current) => {
        const without = current.filter((skill) => skill.id !== created.id)
        return [...without, created].sort((a, b) => a.name.localeCompare(b.name))
      })
      setTechSkillId(created.id)
      setNewSubjectName('')
      setMessage(`Subject “${created.name}” is ready — selected for evaluation.`)
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.message
          : e && typeof e === 'object' && 'message' in e
            ? String((e as { message: unknown }).message)
            : 'Failed to add subject'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  const handleSave = async (event: FormEvent) => {
    event.preventDefault()
    if (!canEvaluate) return
    if (!selectedStudentId) {
      setError('Search and select a student')
      return
    }
    if (!techSkillId) {
      setError('Select a coding language or subject')
      return
    }
    const interviewer = interviewerName.trim()
    if (!interviewer) {
      setError('Enter the interviewer name')
      return
    }
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      await addStudentSkill(selectedStudentId, {
        techSkillId,
        proficiencyLevel,
        verificationStatus,
        notes,
        assessedByName: interviewer,
      })
      setMessage('Evaluation saved. Interviewer name is stored on this skill.')
      setNotes('')
      const skills = await listStudentSkills(selectedStudentId)
      setExistingSkills(skills)
      if (base) {
        void navigate({
          to: `${base}/students/$id` as '/admin/placement/students/$id',
          params: { id: selectedStudentId },
        })
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save evaluation')
    } finally {
      setSaving(false)
    }
  }

  return (
    <PlacementShell title="Tech Stack Evaluate">
      <PlacementPageHeader
        title="Evaluate tech stack"
        description="Search a student by name or roll, score coding languages, and enter interviewer name."
        actions={
          base ? (
            <Button asChild size="sm" variant="outline">
              <PlacementLink href={`${base}/tech-stack/students`}>Students</PlacementLink>
            </Button>
          ) : null
        }
      />
      <TechStackModuleNav />

      {!canEvaluate ? (
        <PlacementEmptyState
          title="Not allowed"
          description="Only Admin, TPO, and Faculty can evaluate tech stack skills."
        />
      ) : (
        <PlacementPageStack>
          <PlacementAlerts error={error} success={message} />
          <PassOutYearFilterBar value={year} onChange={setYear} />

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <form onSubmit={(e) => void handleSave(e)} className="space-y-6">
              <PlacementSectionCard title="Student">
                <PlacementField label="Search student" hint="Type name or roll — matches appear automatically">
                  <StudentTypeahead
                    selectedId={selectedStudentId}
                    selectedLabel={selectedStudentLabel}
                    yearFilter={year}
                    onSelect={(student) => {
                      setSelectedStudentId(student.id)
                      setSelectedStudentLabel(`${student.full_name} · ${student.roll_number}`)
                    }}
                    onClear={() => {
                      setSelectedStudentId('')
                      setSelectedStudentLabel('')
                    }}
                  />
                </PlacementField>
              </PlacementSectionCard>

              <PlacementSectionCard title="Interviewer">
                <PlacementField label="Interviewer name">
                  <Input
                    className="border-border bg-card"
                    value={interviewerName}
                    onChange={(e) => setInterviewerName(e.target.value)}
                    placeholder="Type the interviewer name"
                    required
                  />
                </PlacementField>
              </PlacementSectionCard>

              <PlacementSectionCard title="Coding language / subject">
                <div className="grid gap-4 sm:grid-cols-2">
                  <PlacementField label="Language or skill">
                    <PlacementSelect value={techSkillId} onChange={setTechSkillId}>
                      <option value="">Select…</option>
                      {programmingSkills.map((skill) => (
                        <option key={skill.id} value={skill.id}>
                          {skill.name} ({formatEnumLabel(skill.category)})
                        </option>
                      ))}
                    </PlacementSelect>
                  </PlacementField>
                  <PlacementField label="Proficiency">
                    <PlacementSelect
                      value={proficiencyLevel}
                      onChange={(value) => setProficiencyLevel(value as ProficiencyLevel)}
                    >
                      {PROFICIENCY_LEVELS.map((level) => (
                        <option key={level} value={level}>
                          {formatEnumLabel(level)}
                        </option>
                      ))}
                    </PlacementSelect>
                  </PlacementField>
                  <PlacementField label="Verification">
                    <PlacementSelect
                      value={verificationStatus}
                      onChange={(value) => setVerificationStatus(value as VerificationStatus)}
                    >
                      {VERIFICATION_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {formatEnumLabel(status)}
                        </option>
                      ))}
                    </PlacementSelect>
                  </PlacementField>
                  <PlacementField label="Notes">
                    <Input
                      className="border-border bg-card"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Optional notes"
                    />
                  </PlacementField>
                </div>

                {canCreateSubject ? (
                  <div className="mt-4 rounded-xl border border-border bg-background/40 p-3">
                    <p className="text-sm font-semibold text-foreground">Add new subject</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_180px_auto]">
                      <Input
                        className="border-border bg-card"
                        value={newSubjectName}
                        onChange={(e) => setNewSubjectName(e.target.value)}
                        placeholder="e.g. Kotlin"
                      />
                      <PlacementSelect
                        value={newSubjectCategory}
                        onChange={(value) => setNewSubjectCategory(value as SkillCategory)}
                      >
                        <option value="PROGRAMMING_LANGUAGE">Programming language</option>
                        <option value="FRAMEWORK">Framework</option>
                        <option value="OTHER">Other</option>
                      </PlacementSelect>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={saving || !newSubjectName.trim()}
                        onClick={() => void handleAddSubject()}
                      >
                        Add subject
                      </Button>
                    </div>
                  </div>
                ) : null}
              </PlacementSectionCard>

              {existingSkills.length ? (
                <PlacementSectionCard title="Current skills for student">
                  <ul className="space-y-2 text-sm">
                    {existingSkills.map((skill) => (
                      <li key={skill.id} className="rounded-lg border border-border px-3 py-2">
                        <span className="font-medium">{skill.tech_skill?.name ?? skill.tech_skill_id}</span>
                        <span className="text-muted-foreground">
                          {' · '}
                          {formatEnumLabel(skill.proficiency_level)}
                          {skill.assessed_by_name ? ` · Interviewer: ${skill.assessed_by_name}` : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                </PlacementSectionCard>
              ) : null}

              <div className="flex justify-end">
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving…' : 'Save evaluation'}
                </Button>
              </div>
            </form>
          )}
        </PlacementPageStack>
      )}
    </PlacementShell>
  )
}
