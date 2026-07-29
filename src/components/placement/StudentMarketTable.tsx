import { Trash2 } from 'lucide-react'
import {
  Area,
  AreaChart,
  ResponsiveContainer,
} from 'recharts'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PlacementLink } from '@/components/placement/PlacementLink'
import {
  CompletenessBar,
  PlacementStatusBadge,
  ReadinessStatusBadge,
} from '@/components/placement/PlacementBadges'
import { ReadinessScorePopover } from '@/components/placement/ReadinessScorePopover'
import type { StudentProfileRow } from '@/api/placement/students'

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'ST'
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

function readinessTone(score: number) {
  if (score >= 75) return 'text-[#0ECB81]'
  if (score >= 50) return 'text-[#FF7A00]'
  return 'text-[#C45C1A]'
}

/** Compact sparkline from available profile metrics (no historical prices). */
function studentSparkPoints(student: StudentProfileRow) {
  const cgpa = student.cgpa == null ? 0 : Math.min(100, Number(student.cgpa) * 10)
  const readiness = Number(student.readiness_score ?? 0)
  const completeness = Number(student.profile_completeness ?? 0)
  const communication =
    student.communication_score == null ? readiness * 0.6 : Number(student.communication_score)
  return [
    { i: 0, v: Math.max(8, completeness * 0.55) },
    { i: 1, v: Math.max(8, cgpa * 0.7) },
    { i: 2, v: Math.max(8, readiness * 0.85) },
    { i: 3, v: Math.max(8, communication * 0.9) },
    { i: 4, v: Math.max(8, readiness) },
    { i: 5, v: Math.max(8, (readiness + completeness) / 2) },
  ]
}

function StudentSparkline({ student }: { student: StudentProfileRow }) {
  try {
    const score = Number(student.readiness_score ?? 0)
    const stroke = score >= 75 ? '#0ECB81' : score >= 50 ? '#FF7A00' : '#C45C1A'
    const data = studentSparkPoints(student)

    return (
      <div className="h-8 w-[88px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
            <defs>
              <linearGradient id={`spark-${student.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={stroke} stopOpacity={0.35} />
                <stop offset="100%" stopColor={stroke} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="v"
              stroke={stroke}
              strokeWidth={1.5}
              fill={`url(#spark-${student.id})`}
              isAnimationActive={false}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    )
  } catch {
    return <span className="text-xs text-muted-foreground">—</span>
  }
}

export function StudentMarketTable({
  students,
  base,
  canManage,
  deletingId,
  exportingPdf,
  onDelete,
  onPdf,
}: {
  students: StudentProfileRow[]
  base: string | null
  canManage: boolean
  deletingId: string | null
  exportingPdf: boolean
  onDelete: (id: string, label: string) => void
  onPdf: (id: string, rollNumber: string) => void
}) {
  return (
    <div className="overflow-hidden">
      <Table className="min-w-[980px] border-0">
        <TableHeader>
          <TableRow className="border-white/5 bg-[#12151A] hover:bg-[#12151A]">
            <TableHead className="w-12 text-muted-foreground">#</TableHead>
            <TableHead>Student</TableHead>
            <TableHead className="text-right">CGPA</TableHead>
            <TableHead className="text-right">Readiness</TableHead>
            <TableHead className="w-[100px]">Pulse</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Branch / Year</TableHead>
            <TableHead>Profile</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {students.map((student, index) => {
            const readiness = Number(student.readiness_score ?? 0)
            return (
              <TableRow
                key={student.id}
                className="border-white/5 hover:bg-white/[0.03]"
              >
                <TableCell className="tnum text-xs font-bold text-muted-foreground">
                  {index + 1}
                </TableCell>

                <TableCell>
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-[#FF7A00]/35 bg-[#FF7A00]/10 font-mono text-[11px] font-bold text-[#FF7A00]">
                      {initials(student.full_name)}
                    </div>
                    <div className="min-w-0">
                      {base ? (
                        <PlacementLink
                          href={`${base}/students/$id`}
                          params={{ id: student.id }}
                          className="block truncate font-semibold text-foreground hover:text-[#FF7A00]"
                        >
                          {student.full_name}
                        </PlacementLink>
                      ) : (
                        <p className="truncate font-semibold text-foreground">{student.full_name}</p>
                      )}
                      <p className="mt-0.5 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
                        {student.roll_number}
                        {student.email ? (
                          <span className="ml-2 normal-case tracking-normal opacity-70">
                            {student.email}
                          </span>
                        ) : null}
                      </p>
                    </div>
                  </div>
                </TableCell>

                <TableCell className="tnum text-right font-semibold text-foreground">
                  {student.cgpa == null ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    Number(student.cgpa).toFixed(2)
                  )}
                </TableCell>

                <TableCell className="text-right">
                  <div className="flex flex-col items-end gap-1">
                    <ReadinessScorePopover
                      studentId={student.id}
                      score={readiness}
                      status={student.readiness_status}
                      profileCompleteness={student.profile_completeness}
                    />
                    <ReadinessStatusBadge status={student.readiness_status} />
                  </div>
                </TableCell>

                <TableCell>
                  <StudentSparkline student={student} />
                </TableCell>

                <TableCell>
                  <PlacementStatusBadge status={student.placement_status} />
                </TableCell>

                <TableCell>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm text-foreground">{student.branch || '—'}</span>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {student.graduation_year ??
                        student.academic_batch ??
                        student.batch ??
                        '—'}
                    </span>
                  </div>
                </TableCell>

                <TableCell className="min-w-[120px]">
                  <CompletenessBar value={student.profile_completeness} />
                </TableCell>

                <TableCell>
                  <div className="flex flex-wrap justify-end gap-1.5">
                    {base ? (
                      <Button asChild variant="outline" size="xs">
                        <PlacementLink href={`${base}/students/$id`} params={{ id: student.id }}>
                          Open
                        </PlacementLink>
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      disabled={exportingPdf}
                      onClick={() => onPdf(student.id, student.roll_number)}
                    >
                      PDF
                    </Button>
                    {canManage ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        className="text-[#C45C1A] hover:bg-[#C45C1A]/10"
                        disabled={deletingId === student.id}
                        onClick={() =>
                          onDelete(student.id, `${student.full_name} (${student.roll_number})`)
                        }
                      >
                        <Trash2 className="size-3" />
                        {deletingId === student.id ? '…' : 'Del'}
                      </Button>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
