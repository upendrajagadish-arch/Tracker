import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { CommunicationModuleNav } from '@/components/placement/CommunicationModuleNav'
import { PlacementLink } from '@/components/placement/PlacementLink'
import { PlacementShell, usePlacementPaths } from '@/components/placement/PlacementShell'
import { PlacementPageHeader } from '@/components/placement/PlacementPageHeader'
import {
  PlacementAlerts,
  PlacementField,
  PlacementPageStack,
  PlacementSectionCard,
  PlacementSelect,
} from '@/components/placement/PlacementUi'
import { getStudent } from '@/api/placement/students'
import { createCommunicationEvaluation } from '@/api/placement/communicationEvaluations'
import {
  COMMUNICATION_SECTIONS,
  SCORE_OPTIONS,
  calculateEvaluationTotals,
  emptyScores,
  type CriteriaKey,
} from '@/lib/communicationEvaluation'
import { canEvaluateCommunication } from '@/lib/placementNavigation'
import { useAuth } from '@/hooks/useAuth'
import { StudentTypeahead } from '@/components/placement/StudentTypeahead'

export function CommunicationEvaluationFormPage() {
  const { placementRole, user } = useAuth()
  const { base } = usePlacementPaths()
  const navigate = useNavigate()
  const params = useParams({ strict: false }) as { studentProfileId?: string }
  const studentProfileId = params.studentProfileId
  const isNew = !studentProfileId
  const canManage = canEvaluateCommunication(placementRole)

  const [scores, setScores] = useState<Record<CriteriaKey, number>>(emptyScores())
  const [notes, setNotes] = useState('')
  const [trainerName, setTrainerName] = useState('')
  const [selectedStudentId, setSelectedStudentId] = useState(studentProfileId || '')
  const [selectedStudentLabel, setSelectedStudentLabel] = useState('')
  const [studentLabel, setStudentLabel] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const totals = useMemo(() => {
    try {
      return calculateEvaluationTotals(scores)
    } catch {
      return null
    }
  }, [scores])

  useEffect(() => {
    const boot = async () => {
      setLoading(true)
      setError(null)
      try {
        if (studentProfileId) {
          const student = await getStudent(studentProfileId)
          if (student) {
            const label = `${student.full_name} · ${student.roll_number}`
            setStudentLabel(`${student.full_name} (${student.roll_number})`)
            setSelectedStudentId(student.id)
            setSelectedStudentLabel(label)
          }
        }
        setScores(emptyScores())
        setNotes('')
      } catch (e) {
        const message =
          e && typeof e === 'object' && 'message' in e
            ? String((e as { message: unknown }).message)
            : 'Failed to load evaluation form'
        setError(message)
      } finally {
        setLoading(false)
      }
    }
    void boot()
  }, [studentProfileId])

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    if (!canManage) return
    const targetId = studentProfileId || selectedStudentId
    if (!targetId) {
      setError('Select a student')
      return
    }
    const trimmedTrainer = trainerName.trim()
    if (!trimmedTrainer) {
      setError('Enter the trainer / interviewer name')
      return
    }
    setSaving(true)
    setError(null)
    try {
      // Always INSERT a new evaluation so different interviewers and scores are kept.
      await createCommunicationEvaluation({
        studentProfileId: targetId,
        scores,
        notes,
        evaluatorId: user?.id,
        evaluatorName: trimmedTrainer,
        evaluatorRole: placementRole ?? '',
      })
      if (base) {
        if (studentProfileId) {
          void navigate({
            to: `${base}/students/$id` as '/admin/placement/students/$id',
            params: { id: studentProfileId },
          })
        } else {
          void navigate({ to: `${base}/communication/students` as '/admin/placement/communication/students' })
        }
      }
    } catch (err) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : err instanceof Error
            ? err.message
            : 'Save failed'
      const hint = /could not find the table|schema cache|communication_evaluations/i.test(message)
        ? ' Run scripts/apply-communication-evaluation-migration.sql in the Supabase SQL Editor, then retry.'
        : /communication_score|PGRST204/i.test(message)
          ? ' Student profile columns missing — run the same communication migration SQL, then retry.'
          : ''
      setError(`${message}${hint}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <PlacementShell title="New communication evaluation">
      <PlacementPageHeader
        title="New evaluation"
        description={
          studentLabel
            ? `${studentLabel} — enter trainer name and scores for this interview.`
            : 'Score each criterion from 0 (Not Observed) to 10 (Excellent). Total out of 250. Each save creates a new interview record.'
        }
        actions={
          base ? (
            <Button asChild variant="outline" size="sm">
              <PlacementLink href={`${base}/communication/students`}>← Students</PlacementLink>
            </Button>
          ) : null
        }
      />

      <CommunicationModuleNav />

      <PlacementPageStack>
        <PlacementAlerts error={error} />

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <form onSubmit={(e) => void handleSave(e)} className="space-y-6">
            {isNew && canManage ? (
              <PlacementSectionCard title="Student">
                <PlacementField label="Search student" hint="Type name or roll — matches appear automatically">
                  <StudentTypeahead
                    selectedId={selectedStudentId}
                    selectedLabel={selectedStudentLabel}
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
            ) : null}

            <PlacementSectionCard title="Trainer / Interviewer">
              <PlacementField label="Trainer or interviewer name">
                <input
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  value={trainerName}
                  disabled={!canManage}
                  onChange={(e) => setTrainerName(e.target.value)}
                  placeholder="Type the trainer or interviewer name"
                  required
                />
              </PlacementField>
              <p className="mt-2 text-[12px] text-muted-foreground">
                Saved with this interview. If the student is evaluated again by someone else, enter their name on a new evaluation — both will appear on the admin/faculty student profile.
              </p>
            </PlacementSectionCard>

            {COMMUNICATION_SECTIONS.map((section) => {
              const sectionTotal = section.fields.reduce(
                (sum, field) => sum + (Number(scores[field.key]) || 0),
                0,
              )
              return (
                <PlacementSectionCard
                  key={section.id}
                  title={`${section.title} · ${sectionTotal}/${section.maxTotal}`}
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    {section.fields.map((field) => (
                      <PlacementField key={field.key} label={`${field.label} (${field.marks}M)`}>
                        <PlacementSelect
                          value={String(scores[field.key])}
                          disabled={!canManage}
                          onChange={(value) =>
                            setScores((prev) => ({
                              ...prev,
                              [field.key]: Number(value),
                            }))
                          }
                        >
                          {SCORE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.value} — {opt.label}
                            </option>
                          ))}
                        </PlacementSelect>
                      </PlacementField>
                    ))}
                  </div>
                </PlacementSectionCard>
              )
            })}

            <PlacementSectionCard title="Result">
              <div className="mb-4 grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{totals?.total_score ?? 0}/250</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Percentage</p>
                  <p className="text-2xl font-bold">{totals?.percentage ?? 0}%</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Grade</p>
                  <p className="text-2xl font-bold">{totals?.grade ?? '—'}</p>
                </div>
              </div>
              <PlacementField label="Notes (staff only)">
                <textarea
                  className="min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                  value={notes}
                  disabled={!canManage}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </PlacementField>
              {canManage ? (
                <Button type="submit" disabled={saving} className="mt-4">
                  {saving ? 'Saving…' : 'Save interview'}
                </Button>
              ) : null}
            </PlacementSectionCard>
          </form>
        )}
      </PlacementPageStack>
    </PlacementShell>
  )
}
