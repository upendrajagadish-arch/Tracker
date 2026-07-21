import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import type { Platform, Usernames } from '@/types/api'
import { useProfileCards } from '@/hooks/useCards'
import { splitAccounts } from '@/lib/utils'
import { ALL_PLATFORMS } from '@/api/unifiedClient'
import { SummaryStrip } from '@/components/SummaryStrip'
import { PlatformCard } from '@/components/PlatformCard'
import { GitHubCard } from '@/components/GitHubCard'
import { LeetCodeCard } from '@/components/LeetCodeCard'
import { CodeforcesCard } from '@/components/CodeforcesCard'
import { GFGCard } from '@/components/GFGCard'
import { CodeChefCard } from '@/components/CodeChefCard'
import { HackerRankCard } from '@/components/HackerRankCard'
import { TUFCard } from '@/components/TUFCard'
import { PlacementLoadingBlock } from '@/components/placement/PlacementStates'
import {
  PlacementStatusBadge,
  ReadinessStatusBadge,
} from '@/components/placement/PlacementBadges'
import {
  ShareMetric,
  ShareNotAvailable,
  ShareProfileSection,
} from '@/components/placement/ShareProfileSection'
import type { PublicStudentPerformance } from '@/api/placement/studentShare'
import {
  platformHandlesToUsernames,
  resolvePlatformHandles,
} from '@/lib/studentPlatformHandles'
import type { StudentProfileRow } from '@/api/placement/students'
import { COMMUNICATION_SECTIONS } from '@/lib/communicationEvaluation'
import {
  classifyCommunicationBadge,
  formatCommunicationBadge,
} from '@/lib/communicationBadge'
import {
  buildOverallPerformanceSummary,
  blendCodingPercent,
  codingPercentFromSolved,
  githubPercentFromActivity,
} from '@/lib/overallPerformance'
import { CODENOW_CATEGORY_LABELS, type CodeNowCategory } from '@/lib/codeNowCategories'

const CARD_RENDERERS: Record<Platform, (username: string) => ReactNode> = {
  github: (u) => <GitHubCard username={u} />,
  leetcode: (u) => <LeetCodeCard username={u} />,
  codeforces: (u) => <CodeforcesCard username={u} />,
  gfg: (u) => <GFGCard username={u} />,
  codechef: (u) => <CodeChefCard username={u} />,
  hackerrank: (u) => <HackerRankCard username={u} />,
  tuf: (u) => <TUFCard username={u} />,
}

function hasAnyUsername(usernames: Usernames) {
  return ALL_PLATFORMS.some((platform) => usernames[platform]?.trim())
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Not Available'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return 'Not Available'
  return d.toLocaleDateString()
}

function display(value: unknown, suffix = '') {
  if (value == null || value === '') return 'Not Available'
  return `${value}${suffix}`
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'ST'
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

function performanceGaugeColor(score: number) {
  if (score >= 80) return '#0ECB81'
  if (score >= 70) return '#D27918'
  if (score >= 60) return '#F0B90B'
  if (score >= 50) return '#F6465D'
  return '#9B1C31'
}

const GAUGE_SEGMENTS: Array<{ from: number; to: number; color: string }> = [
  { from: 0, to: 50, color: '#9B1C31' },
  { from: 50, to: 60, color: '#F6465D' },
  { from: 60, to: 70, color: '#F0B90B' },
  { from: 70, to: 80, color: '#D27918' },
  { from: 80, to: 100, color: '#0ECB81' },
]

/** Maps a 0–100 score to a point on the semicircle (180° = score 0, 0° = score 100). */
function gaugePoint(cx: number, cy: number, r: number, score: number) {
  const angle = Math.PI * (1 - score / 100)
  return { x: cx + r * Math.cos(angle), y: cy - r * Math.sin(angle) }
}

function gaugeBandPath(cx: number, cy: number, outer: number, inner: number, from: number, to: number) {
  const oStart = gaugePoint(cx, cy, outer, from)
  const oEnd = gaugePoint(cx, cy, outer, to)
  const iEnd = gaugePoint(cx, cy, inner, to)
  const iStart = gaugePoint(cx, cy, inner, from)
  return [
    `M ${oStart.x.toFixed(2)} ${oStart.y.toFixed(2)}`,
    `A ${outer} ${outer} 0 0 1 ${oEnd.x.toFixed(2)} ${oEnd.y.toFixed(2)}`,
    `L ${iEnd.x.toFixed(2)} ${iEnd.y.toFixed(2)}`,
    `A ${inner} ${inner} 0 0 0 ${iStart.x.toFixed(2)} ${iStart.y.toFixed(2)}`,
    'Z',
  ].join(' ')
}

function PerformanceScoreGauge({
  score,
  status,
}: {
  score: number | null
  status: string
}) {
  const cx = 110
  const cy = 104
  const outer = 96
  const inner = 62
  const normalized = score == null ? 0 : Math.max(0, Math.min(100, score))
  const color = performanceGaugeColor(normalized)
  const segmentGap = 1.2

  return (
    <div
      className="flex w-full shrink-0 flex-col items-center rounded-2xl border bg-card/95 px-5 py-4 text-center shadow-[0_14px_35px_-24px_rgba(0,0,0,0.9)] sm:w-auto"
      style={{ borderColor: `${color}66`, boxShadow: `0 14px 35px -24px ${color}` }}
      aria-label={score == null ? 'Overall score not available' : `Overall score ${score} percent`}
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        Overall score
      </p>
      <div className="relative mt-2 w-48">
        <svg viewBox="0 0 220 128" className="w-full" aria-hidden>
          {GAUGE_SEGMENTS.map((segment) => {
            const active = score != null && normalized >= segment.from && normalized < (segment.to === 100 ? 101 : segment.to)
            return (
              <path
                key={segment.from}
                d={gaugeBandPath(
                  cx,
                  cy,
                  outer,
                  inner,
                  segment.from + (segment.from === 0 ? 0 : segmentGap),
                  segment.to - (segment.to === 100 ? 0 : segmentGap),
                )}
                fill={segment.color}
                opacity={score == null ? 0.25 : active ? 1 : 0.35}
                style={{
                  transition: 'opacity 400ms ease',
                  filter: active ? `drop-shadow(0 0 6px ${segment.color}99)` : undefined,
                }}
              />
            )
          })}

          {/* boundary tick labels */}
          {[0, 50, 60, 70, 80, 100].map((tick) => {
            const p = gaugePoint(cx, cy, outer + 7, tick)
            const atEnd = tick === 0 || tick === 100
            return (
              <text
                key={tick}
                x={p.x}
                y={atEnd ? p.y + 12 : p.y + 3}
                textAnchor={atEnd || tick === 50 ? 'middle' : 'start'}
                fontSize="8"
                fill="var(--muted-foreground, #848E9C)"
                className="font-mono"
              >
                {tick}
              </text>
            )
          })}

          {/* needle */}
          {score != null ? (
            <g
              style={{
                transform: `rotate(${(normalized / 100) * 180}deg)`,
                transformOrigin: `${cx}px ${cy}px`,
                transition: 'transform 900ms cubic-bezier(0.34, 1.3, 0.4, 1)',
              }}
            >
              <polygon
                points={`${cx - outer + 8},${cy} ${cx},${cy - 4.5} ${cx},${cy + 4.5}`}
                fill="var(--foreground, #EAECEF)"
              />
            </g>
          ) : null}
          <circle cx={cx} cy={cy} r="8" fill="var(--foreground, #EAECEF)" />
          <circle cx={cx} cy={cy} r="3.5" fill="var(--card, #161A1E)" />

          <text
            x={cx}
            y={cy - 22}
            textAnchor="middle"
            fontSize="24"
            fontWeight="700"
            className="font-pixel"
            fill={color}
            stroke="var(--card, #161A1E)"
            strokeWidth="3"
            paintOrder="stroke"
            style={{ filter: `drop-shadow(0 0 8px ${color}66)` }}
          >
            {score == null ? '—' : `${score}%`}
          </text>
        </svg>
      </div>
      <p className="mt-1 max-w-40 text-xs font-semibold" style={{ color }}>
        {status}
      </p>
    </div>
  )
}

export function PublicStudentPerformanceCard({ profile }: { profile: PublicStudentPerformance }) {
  const [criteriaOpen, setCriteriaOpen] = useState(false)

  const usernames = useMemo(() => {
    const pseudoStudent = {
      github_url: profile.githubUrl || '',
      platform_handles: profile.platformHandles,
    } as Pick<StudentProfileRow, 'github_url' | 'platform_handles'>
    return platformHandlesToUsernames(resolvePlatformHandles(pseudoStudent))
  }, [profile.platformHandles, profile.githubUrl])

  const { loaded, isLoading, activeCount } = useProfileCards(usernames)
  const showCoding = hasAnyUsername(usernames)
  const githubUsername = usernames.github?.trim() || null
  const githubUrl =
    profile.githubUrl || (githubUsername ? `https://github.com/${githubUsername}` : null)

  const liveSolved = loaded.length
    ? loaded
        .filter((card) => card.category !== 'development')
        .reduce((sum, card) => sum + (card.stats.totalSolved ?? 0), 0)
    : profile.totalSolved

  const githubCard = loaded.find((c) => c.platform === 'github')
  const overall = buildOverallPerformanceSummary({
    codingPercent: blendCodingPercent(
      codingPercentFromSolved(liveSolved),
      profile.codeNow?.percentage ?? null,
    ),
    githubPercent: githubPercentFromActivity({
      commits: githubCard?.stats.totalSolved ?? null,
      stars: githubCard?.rating?.current ?? githubCard?.contests?.rating ?? null,
    }),
    communicationPercent: profile.communication?.percentage ?? null,
    aptitudePercent: profile.aptitude?.percentage ?? null,
    verbalPercent: profile.verbal?.percentage ?? null,
  })

  const codingAccounts = (Object.entries(usernames) as [Platform, string][])
    .filter(([platform]) => platform !== 'github')
    .flatMap(([platform, value]) =>
      splitAccounts(value).map((username) => ({ platform, username })),
    )

  return (
    <div className="fade-in mx-auto max-w-5xl overflow-x-hidden px-4 py-8 sm:px-6 md:px-8">
      <header className="mb-6 overflow-hidden rounded-card border border-soft bg-card">
        <div className="flex flex-col gap-5 px-5 py-7 sm:flex-row sm:items-center sm:px-8">
          <div className="flex size-16 shrink-0 items-center justify-center rounded-full border-2 border-primary/30 bg-primary/15 font-pixel text-xl text-primary">
            {initials(profile.fullName)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
              CodeTrace · Shared performance profile
            </p>
            <h1 className="mt-2 break-words font-pixel text-3xl text-foreground md:text-4xl">
              {profile.fullName}
            </h1>
            <p className="mt-2 break-words font-mono text-sm text-muted-foreground">
              {profile.rollNumber} · {profile.branch || '—'} ·{' '}
              {profile.batch || profile.graduationYear || '—'}
            </p>
            {profile.headline ? (
              <p className="mt-2 break-words text-sm text-foreground/80">{profile.headline}</p>
            ) : null}
          </div>
          <PerformanceScoreGauge
            score={overall.overallPercent}
            status={overall.overallStatus}
          />
        </div>
      </header>

      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ShareMetric label="Readiness" value={profile.readinessScore} hint={profile.readinessStatus} />
        <ShareMetric label="CGPA" value={display(profile.cgpa)} />
        <ShareMetric
          label="Placement"
          value={<PlacementStatusBadge status={profile.placementStatus} />}
        />
        <ShareMetric
          label="Problems solved"
          value={liveSolved}
          hint={`${profile.linkedCount || activeCount} platforms linked`}
        />
      </div>

      <div className="space-y-5">
        <ShareProfileSection number="01" title="Student Identity" description="Core identity details">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <ShareMetric label="Name" value={profile.fullName} />
            <ShareMetric label="Roll number" value={profile.rollNumber} />
            <ShareMetric label="Department" value={display(profile.branch)} />
            <ShareMetric label="Batch" value={display(profile.batch)} />
            <ShareMetric label="Graduation year" value={display(profile.graduationYear)} />
            <ShareMetric label="Headline" value={display(profile.headline || profile.careerInterest)} />
            <ShareMetric
              label="Readiness status"
              value={<ReadinessStatusBadge status={profile.readinessStatus} />}
            />
            <ShareMetric label="Skills summary" value={display(profile.skillsSummary)} />
          </div>
        </ShareProfileSection>

        <ShareProfileSection
          number="02"
          title="Coding Platform Performance"
          description="Live platform cards where handles are linked"
        >
          {profile.codingSyncedAt ? (
            <p className="mb-3 text-xs text-muted-foreground">
              Snapshot synced: {formatDate(profile.codingSyncedAt)}
            </p>
          ) : null}
          {showCoding && codingAccounts.length ? (
            <>
              {isLoading && !loaded.length ? (
                <PlacementLoadingBlock label="Loading coding platform results…" />
              ) : (
                <>
                  <SummaryStrip usernames={usernames} />
                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                    {codingAccounts.map(({ platform, username }, index) => (
                      <PlatformCard
                        key={`${platform}-${username}`}
                        platform={platform}
                        username={username}
                        animIndex={index}
                      >
                        {CARD_RENDERERS[platform](username)}
                      </PlatformCard>
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <ShareNotAvailable label="Not Available — no coding platform accounts linked." />
          )}

          <div className="mt-4 rounded-lg border border-border bg-background/70 p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              CodeNow
            </p>
            {profile.codeNow ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <ShareMetric
                  label="Score"
                  value={
                    profile.codeNow.totalScore != null && profile.codeNow.maxScore != null
                      ? `${profile.codeNow.totalScore}/${profile.codeNow.maxScore}`
                      : 'Not Available'
                  }
                />
                <ShareMetric label="Percentage" value={display(profile.codeNow.percentage, '%')} />
                <ShareMetric label="Grade" value={display(profile.codeNow.grade)} />
                <ShareMetric
                  label="Challenges"
                  value={
                    profile.codeNow.solvedChallenges != null && profile.codeNow.totalChallenges != null
                      ? `${profile.codeNow.solvedChallenges}/${profile.codeNow.totalChallenges}`
                      : display(profile.codeNow.totalChallenges)
                  }
                />
                <ShareMetric label="Username" value={display(profile.codeNow.username)} />
                <ShareMetric label="Last synced" value={formatDate(profile.codeNow.lastSyncedAt)} />
                {Object.keys(profile.codeNow.categorySummary || {}).length ? (
                  <div className="sm:col-span-2 lg:col-span-3">
                    <p className="mb-2 text-xs font-medium text-muted-foreground">Category summary</p>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {Object.entries(profile.codeNow.categorySummary).map(([key, value]) => (
                        <ShareMetric
                          key={key}
                          label={CODENOW_CATEGORY_LABELS[key as CodeNowCategory] || key}
                          value={`${value}%`}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="mt-2">
                <ShareNotAvailable />
              </div>
            )}
          </div>
        </ShareProfileSection>

        <ShareProfileSection number="03" title="GitHub Activity" description="Public repositories and activity">
          {githubUsername || githubUrl ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <ShareMetric label="GitHub username" value={display(githubUsername ? `@${githubUsername}` : null)} />
                <ShareMetric
                  label="Profile link"
                  value={
                    githubUrl ? (
                      <a
                        href={githubUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="break-all text-primary hover:underline"
                      >
                        {githubUrl}
                      </a>
                    ) : (
                      'Not Available'
                    )
                  }
                />
              </div>
              {githubUsername ? (
                isLoading && !githubCard ? (
                  <PlacementLoadingBlock label="Loading GitHub activity…" />
                ) : (
                  <PlatformCard platform="github" username={githubUsername} animIndex={0}>
                    <GitHubCard username={githubUsername} />
                  </PlatformCard>
                )
              ) : null}
            </div>
          ) : (
            <ShareNotAvailable />
          )}
        </ShareProfileSection>

        <ShareProfileSection
          number="04"
          title="Communication Evaluation"
          description="250-mark structured assessment"
        >
          {profile.communication ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <ShareMetric
                  label="Communication"
                  value={`${profile.communication.totalScore}/${profile.communication.maxScore}`}
                />
                <ShareMetric label="Percentage" value={`${profile.communication.percentage}%`} />
                <ShareMetric label="Grade" value={profile.communication.grade} />
                <ShareMetric
                  label="Badge"
                  value={formatCommunicationBadge(
                    classifyCommunicationBadge(profile.communication.totalScore),
                  )}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <ShareMetric
                  label="Last evaluated"
                  value={formatDate(profile.communication.evaluatedAt)}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <ShareMetric
                  label="Communication Proficiency"
                  value={`${profile.communication.proficiencyTotal}/80`}
                />
                <ShareMetric
                  label="Presentation Skills"
                  value={`${profile.communication.presentationTotal}/60`}
                />
                <ShareMetric
                  label="Behavioural Skills"
                  value={`${profile.communication.behaviouralTotal}/110`}
                />
              </div>

              {profile.communication.criteria ? (
                <div>
                  <button
                    type="button"
                    className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
                    onClick={() => setCriteriaOpen((v) => !v)}
                  >
                    {criteriaOpen ? 'Hide' : 'Show'} 25-parameter breakdown
                  </button>
                  {criteriaOpen ? (
                    <div className="mt-4 space-y-4">
                      {COMMUNICATION_SECTIONS.map((section) => (
                        <div key={section.id} className="rounded-lg border border-border bg-background/60 p-3">
                          <p className="mb-2 text-sm font-semibold text-foreground">
                            {section.title} (/{section.maxTotal})
                          </p>
                          <div className="grid gap-2 sm:grid-cols-2">
                            {section.fields.map((field, idx) => (
                              <div
                                key={field.key}
                                className="flex min-w-0 items-start justify-between gap-2 rounded border border-border/70 px-2.5 py-1.5 text-xs"
                              >
                                <span className="min-w-0 break-words text-muted-foreground">
                                  {idx + 1 + (section.id === 'presentation' ? 8 : section.id === 'behavioural' ? 14 : 0)}.{' '}
                                  {field.label}
                                </span>
                                <span className="shrink-0 font-mono font-semibold text-foreground">
                                  {profile.communication?.criteria?.[field.key] ?? '—'}/10
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : (
                <ShareNotAvailable label="Detailed criteria not available for this evaluation." />
              )}
            </div>
          ) : (
            <ShareNotAvailable />
          )}
        </ShareProfileSection>

        <ShareProfileSection number="05" title="Aptitude Performance">
          {profile.aptitude ? (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <ShareMetric
                  label="Score"
                  value={
                    profile.aptitude.score != null && profile.aptitude.maxScore != null
                      ? `${profile.aptitude.score}/${profile.aptitude.maxScore}`
                      : 'Not Available'
                  }
                />
                <ShareMetric label="Percentage" value={display(profile.aptitude.percentage, '%')} />
                <ShareMetric label="Grade / status" value={display(profile.aptitude.grade)} />
                <ShareMetric label="Test name" value={display(profile.aptitude.testName)} />
                <ShareMetric label="Last updated" value={formatDate(profile.aptitude.evaluatedAt)} />
              </div>
              {Object.keys(profile.aptitude.categoryBreakdown || {}).length ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {Object.entries(profile.aptitude.categoryBreakdown).map(([key, value]) => (
                    <ShareMetric key={key} label={key} value={value} />
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <ShareNotAvailable />
          )}
        </ShareProfileSection>

        <ShareProfileSection number="06" title="Verbal Performance">
          {profile.verbal ? (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <ShareMetric
                  label="Score"
                  value={
                    profile.verbal.score != null && profile.verbal.maxScore != null
                      ? `${profile.verbal.score}/${profile.verbal.maxScore}`
                      : 'Not Available'
                  }
                />
                <ShareMetric label="Percentage" value={display(profile.verbal.percentage, '%')} />
                <ShareMetric label="Grade / status" value={display(profile.verbal.grade)} />
                <ShareMetric label="Test name" value={display(profile.verbal.testName)} />
                <ShareMetric label="Last updated" value={formatDate(profile.verbal.evaluatedAt)} />
              </div>
              {Object.keys(profile.verbal.categoryBreakdown || {}).length ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {Object.entries(profile.verbal.categoryBreakdown).map(([key, value]) => (
                    <ShareMetric key={key} label={key} value={value} />
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <ShareNotAvailable />
          )}
        </ShareProfileSection>

        <ShareProfileSection
          number="07"
          title="Overall Performance Summary"
          description="Display-only composite (does not change placement readiness)"
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <ShareMetric label="Coding score" value={display(overall.codingPercent, '%')} />
            <ShareMetric label="GitHub score" value={display(overall.githubPercent, '%')} />
            <ShareMetric
              label="Communication %"
              value={display(overall.communicationPercent, '%')}
            />
            <ShareMetric label="Aptitude %" value={display(overall.aptitudePercent, '%')} />
            <ShareMetric label="Verbal %" value={display(overall.verbalPercent, '%')} />
            <ShareMetric
              label="Overall %"
              value={
                overall.overallPercent != null
                  ? `${overall.overallPercent}% · ${overall.overallStatus}`
                  : 'Not Available'
              }
            />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-background/70 px-3 py-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                Strengths
              </p>
              <p className="mt-2 text-sm text-foreground">
                {overall.strengths.length ? overall.strengths.join(' · ') : 'Not Available'}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-background/70 px-3 py-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                Improvement areas
              </p>
              <p className="mt-2 text-sm text-foreground">
                {overall.improvementAreas.length
                  ? overall.improvementAreas.join(' · ')
                  : 'Not Available'}
              </p>
            </div>
          </div>
          {overall.missingComponents.length ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Missing components (excluded from overall):{' '}
              {overall.missingComponents.join(', ')}
            </p>
          ) : null}
        </ShareProfileSection>
      </div>

      <p className="mt-10 text-center font-mono text-[10px] text-muted-foreground/60">
        Shared student performance · read-only · no login required
        {profile.generatedAt ? ` · generated ${formatDate(profile.generatedAt)}` : ''}
      </p>
    </div>
  )
}
