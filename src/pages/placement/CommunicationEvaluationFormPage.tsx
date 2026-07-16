import { useEffect, useMemo, useState } from 'react'
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
import { listStudents } from '@/api/placement/students'
import {
  getLatestEvaluationForStudent,
  saveStudentCommunicationEvaluation,
  createCommunicationEvaluation,
} from '@/api/placement/communicationEvaluations'
import {
  ALL_CRITERIA_KEYS,
  COMMUNICATION_SECTIONS,
  SCORE_OPTIONS,
  calculateEvaluationTotals,
  emptyScores,
  type CriteriaKey,
} from '@/lib/communicationEvaluation'
import { canManageReadiness } from '@/lib/placementNavigation'
import { useAuth } from '@/hooks/useAuth'

export function CommunicationEvaluationFormPage() {
  const { placementRole, user } = useAuth()
  const { base } = usePlacementPaths()
  const navigate = useNavigate()
  const params = useParams({ strict: false }) as { studentProfileId?: string }
  const studentProfileId = params.studentProfileId
  const isNew = !studentProfileId
  const canManage = canManageReadiness(placementRole)

  const [scores, setScores] = useState<Record<CriteriaKey, number>>(emptyScores())
  const [notes, setNotes] = useState('')
  const [selectedStudentId, setSelectedStudentId] = useState(studentProfileId || '')
  const [students, setStudents] = useState<Array<{ id: string; label: string }>>([])
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
        if (isNew && canManage) {
          const page = await listStudents({ limit: 200 })
          setStudents(
            page.data.map((s) => ({
              id: s.id,
              label: `${s.roll_number} — ${s.full_name}`,
            })),
          )
        }
        const id = studentProfileId || selectedStudentId
        if (id) {
          const evaluation = await getLatestEvaluationForStudent(id)
          if (evaluation) {
            const next = emptyScores()
            for (const key of ALL_CRITERIA_KEYS) {
              next[key] = Number(evaluation[key] ?? 0)
            }
            setScores(next)
            setNotes(evaluation.notes || '')
            setStudentLabel(`${evaluation.student_name} (${evaluation.roll_number})`)
          }
        }
      } catch (e) {
        const message =
          e && typeof e === 'object' && 'message' in e
            ? String((e as { message: unknown }).message)
            : 'Failed to load evaluation'
        setError(message)
      } finally {
        setLoading(false)
      }
    }
    void boot()
  }, [studentProfileId, isNew, canManage])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canManage) return
    const targetId = studentProfileId || selectedStudentId
    if (!targetId) {
      setError('Select a student')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const payload = {
        scores,
        notes,
        evaluatorId: user?.id,
        evaluatorName: user?.email ?? '',
        evaluatorRole: placementRole ?? '',
      }
      if (studentProfileId) {
        await saveStudentCommunicationEvaluation(targetId, payload)
      } else {
        await createCommunicationEvaluation({ studentProfileId: targetId, ...payload })
      }
      if (base) {
        void navigate({ to: `${base}/communication/students` as '/admin/placement/communication/students' })
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
    <PlacementShell title={isNew ? 'New communication evaluation' : 'Communication evaluation'}>
      <PlacementPageHeader
        title={isNew ? 'New evaluation' : canManage ? 'Edit evaluation' : 'View evaluation'}
        description={
          studentLabel || 'Score each criterion from 0 (Not Observed) to 10 (Excellent). Total out of 250.'
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
                <PlacementField label="Select student">
                  <PlacementSelect
                    value={selectedStudentId}
                    onChange={(value) => setSelectedStudentId(value)}
                  >
                    <option value="">Select student…</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </PlacementSelect>
                </PlacementField>
              </PlacementSectionCard>
            ) : null}

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
                  {saving ? 'Saving…' : 'Save evaluation'}
                </Button>
              ) : null}
            </PlacementSectionCard>
          </form>
        )}
      </PlacementPageStack>
    </PlacementShell>
  )
}
