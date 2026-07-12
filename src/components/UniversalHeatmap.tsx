import { useMemo, useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import type { GitHubContributions, LeetCodeHeatmapData, HackerRankHeatmapData } from '../types/api';

interface Props {
  // Pass one of the three data types
  calendar?: Record<string, number>;
  githubContributions?: GitHubContributions;
  leetcodeHeatmap?: LeetCodeHeatmapData;
  hackerrankHeatmap?: HackerRankHeatmapData;

  // Overrides for header stats
  totalSubmissions?: number;
  activeDays?: number;
  maxStreak?: number;
  startDate?: string;
  endDate?: string;

  // Custom label (e.g. 'contributions', 'submissions')
  label?: string;
  periodLabel?: string;
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

// Indigo contribution ramp (level 0 → 4). Matches --primary (#7c83ff).
const LEVELS = ['#101015', '#252750', '#3f43a8', '#5b60e0', '#7c83ff'];

// Local YYYY-MM-DD — avoids the UTC shift that `toISOString()` introduces for
// non-UTC timezones (which silently misaligns every calendar lookup by a day).
function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function levelFor(count: number, max: number): number {
  if (count <= 0) return 0;
  const pct = count / max;
  if (pct < 0.25) return 1;
  if (pct < 0.5) return 2;
  if (pct < 0.75) return 3;
  return 4;
}

export function UniversalHeatmap({
  calendar,
  githubContributions,
  leetcodeHeatmap,
  hackerrankHeatmap,
  totalSubmissions: propTotal,
  activeDays: propActiveDays,
  maxStreak: propMaxStreak,
  startDate,
  endDate,
  label = 'submissions',
  periodLabel,
}: Props) {

  // Year selection state (GitHub year-keyed calendar only)
  const availableYears = useMemo(() => {
    if (githubContributions) return Object.keys(githubContributions.contributions).sort((a, b) => Number(b) - Number(a));
    return ['Current'];
  }, [githubContributions]);

  const [selectedYear, setSelectedYear] = useState<string>(availableYears[0] ?? 'Current');

  // Hover tooltip — single floating element following the cursor
  const gridWrapRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<{ date: string; count: number; x: number; y: number } | null>(null);

  const { weeks, maxCount, computedTotal, computedActive, computedStreak } = useMemo(() => {
    let finalWeeks: { date: string; count: number }[][] = [];
    let active = 0;
    let currentStreak = 0;
    let maxStreak = 0;
    let total = 0;
    let maxCount = 1;

    if (githubContributions) {
      const yearData = githubContributions.contributions[selectedYear];
      if (yearData?.data?.user?.contributionsCollection?.contributionCalendar?.weeks) {
        finalWeeks = yearData.data.user.contributionsCollection.contributionCalendar.weeks.map(
          w => {
            const days: ({ date: string; count: number } | null)[] = new Array(7).fill(null);
            w.contributionDays.forEach(d => {
              const [y, m, day] = d.date.split('-');
              const dateObj = new Date(Number(y), Number(m) - 1, Number(day));
              const dayIndex = dateObj.getDay();
              days[dayIndex] = { date: d.date, count: d.contributionCount };
            });
            return days as { date: string; count: number }[];
          }
        );
      }
    } else {
      // Build an aligned week grid for the provided range, falling back
      // to the trailing year when no explicit range is available.
      const rangeStart = startDate ? new Date(`${startDate}T00:00:00`) : new Date();
      const rangeEnd = endDate ? new Date(`${endDate}T00:00:00`) : new Date();
      rangeStart.setHours(0, 0, 0, 0);
      rangeEnd.setHours(0, 0, 0, 0);

      if (!startDate || !endDate) {
        rangeStart.setDate(rangeEnd.getDate() - (51 * 7 + 6));
      }

      const startSunday = new Date(rangeStart);
      startSunday.setDate(rangeStart.getDate() - rangeStart.getDay());

      const endSaturday = new Date(rangeEnd);
      endSaturday.setDate(rangeEnd.getDate() + (6 - rangeEnd.getDay()));

      // If we have leetcode/hackerrank heatmap data, construct a calendar record
      let lookupCalendar = calendar ?? {};
      if (leetcodeHeatmap) {
        lookupCalendar = {};
        for (const day of leetcodeHeatmap.dailyContributions) lookupCalendar[day.date] = day.count;
      } else if (hackerrankHeatmap) {
        lookupCalendar = {};
        for (const day of hackerrankHeatmap.dailyContributions) lookupCalendar[day.date] = day.count;
      }

      const days: { date: string; count: number }[] = [];
      for (let d = new Date(startSunday); d <= endSaturday; d.setDate(d.getDate() + 1)) {
        const ts = String(Math.floor(d.getTime() / 1000));
        const dateStr = ymd(d);
        const count = lookupCalendar[ts] ?? lookupCalendar[dateStr] ?? 0;
        days.push({ date: dateStr, count });
      }

      for (let w = 0; w < Math.ceil(days.length / 7); w++) {
        finalWeeks.push(days.slice(w * 7, w * 7 + 7));
      }
    }

    const allDays = finalWeeks.flat().filter(Boolean);
    allDays.forEach(d => {
      total += d.count;
      if (d.count > 0) {
        active++;
        currentStreak++;
        if (currentStreak > maxStreak) maxStreak = currentStreak;
      } else {
        currentStreak = 0;
      }
      if (d.count > maxCount) maxCount = d.count;
    });

    return {
      weeks: finalWeeks,
      maxCount: Math.max(maxCount, 1),
      computedTotal: total,
      computedActive: active,
      computedStreak: maxStreak,
    };
  }, [calendar, endDate, githubContributions, hackerrankHeatmap, leetcodeHeatmap, selectedYear, startDate]);

  const total = propTotal ?? (leetcodeHeatmap ? leetcodeHeatmap.totalSubmissions : (hackerrankHeatmap ? hackerrankHeatmap.totalSubmissions : computedTotal));
  const activeDays = propActiveDays ?? (leetcodeHeatmap ? leetcodeHeatmap.activeDays : (hackerrankHeatmap ? hackerrankHeatmap.activeDays : computedActive));
  const maxStreak = propMaxStreak ?? (leetcodeHeatmap ? leetcodeHeatmap.longestStreak : (hackerrankHeatmap ? hackerrankHeatmap.longestStreak : computedStreak));
  const visiblePeriod = periodLabel ?? (selectedYear === 'Current' ? 'the past year' : selectedYear);

  const monthLabels = useMemo(() => {
    const labels: { label: string; col: number }[] = [];
    let lastMonth = -1;
    weeks.forEach((week, i) => {
      const day = week.find(Boolean);
      if (!day) return;
      const m = Number(day.date.split('-')[1]) - 1;
      if (m !== lastMonth) {
        labels.push({ label: MONTHS[m], col: i });
        lastMonth = m;
      }
    });
    return labels;
  }, [weeks]);

  // Matches the unified profile calendar geometry (12px blocks, 4px gutters).
  const CELL = 12;       // cell size in px
  const GAP = 4;         // gap between cells
  const STRIDE = CELL + GAP;

  return (
    <div className="relative font-sans">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-baseline gap-2.5">
              <span className="font-serif text-3xl md:text-4xl font-light leading-none tracking-tight text-foreground">
                {total.toLocaleString()}
              </span>
              <span className="text-sm text-muted-foreground">{label} in {visiblePeriod}</span>
            </div>
            <p className="mt-3 font-mono text-[11px] text-muted-foreground">
              {activeDays.toLocaleString()} active days · {maxStreak}d max streak
              {availableYears.length <= 1 && ` · best day ${maxCount.toLocaleString()}`}
            </p>
          </div>

          {/* Year selector — mono text buttons, underline for the active year */}
          {availableYears.length > 1 && (
            <div className="flex flex-wrap gap-4">
              {availableYears.map(y => (
                <button
                  key={y}
                  onClick={() => setSelectedYear(y)}
                  className={cn(
                    'border-b pb-1 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors',
                    y === selectedYear
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground/60 hover:text-foreground',
                  )}
                >
                  {y}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Heatmap Grid */}
        <div ref={gridWrapRef} className="relative">
          <div className="overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
            <div style={{ minWidth: weeks.length * STRIDE + 36 }}>
              {/* month labels */}
              <div className="relative mb-1 h-4" style={{ paddingLeft: 30 }}>
                {monthLabels.map(({ label, col }, i) => (
                  <span key={i} className="absolute text-[11px] font-medium text-muted-foreground/80" style={{ left: col * STRIDE + 30 }}>
                    {label}
                  </span>
                ))}
              </div>
              <div className="flex" style={{ gap: GAP }}>
                {/* weekday labels */}
                <div className="mr-1 flex flex-col pt-[1px]" style={{ gap: GAP }}>
                  {DAYS.map((d, i) => (
                    <div key={i} className="flex items-center justify-end pr-1 text-[10px] leading-none text-muted-foreground/70" style={{ height: CELL, width: 26 }}>
                      {d}
                    </div>
                  ))}
                </div>
                {weeks.map((week, wi) => (
                  <div key={wi} className="flex flex-col" style={{ gap: GAP }}>
                    {week.map((day, di) => {
                      if (!day) return <div key={`empty-${di}`} style={{ width: CELL, height: CELL }} />;
                      const lvl = levelFor(day.count, maxCount);
                      return (
                        <div
                          key={day.date}
                          className="rounded-[3px] transition-transform duration-100 hover:scale-125 hover:ring-1 hover:ring-primary/70"
                          style={{
                            width: CELL,
                            height: CELL,
                            backgroundColor: LEVELS[lvl],
                            boxShadow: lvl >= 3 ? `0 0 8px -2px ${LEVELS[4]}` : undefined,
                          }}
                          onMouseEnter={(e) => {
                            const rect = gridWrapRef.current?.getBoundingClientRect();
                            if (!rect) return;
                            setHovered({ date: day.date, count: day.count, x: e.clientX - rect.left, y: e.clientY - rect.top });
                          }}
                          onMouseMove={(e) => {
                            const rect = gridWrapRef.current?.getBoundingClientRect();
                            if (!rect) return;
                            setHovered({ date: day.date, count: day.count, x: e.clientX - rect.left, y: e.clientY - rect.top });
                          }}
                          onMouseLeave={() => setHovered(null)}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="mt-3 flex items-center justify-end gap-1.5 text-[10px] font-mono text-muted-foreground/70">
            <span>Less</span>
            {LEVELS.map((c, i) => (
              <span key={i} className="rounded-[3px]" style={{ width: 11, height: 11, backgroundColor: c }} />
            ))}
            <span>More</span>
          </div>

          {/* Instant styled tooltip */}
          {hovered && (
            <div
              className="pointer-events-none absolute z-50 -translate-x-1/2 -translate-y-full"
              style={{ left: hovered.x, top: hovered.y - 10 }}
            >
              <div className="relative min-w-[150px] rounded-xl border border-primary/20 bg-popover/95 px-3 py-2 shadow-2xl shadow-black/50 backdrop-blur-md">
                <p className="text-[11px] font-medium tracking-wide text-foreground">
                  {new Date(`${hovered.date}T00:00:00`).toLocaleDateString(undefined, {
                    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
                  })}
                </p>
                <p className="flex items-baseline gap-1 font-mono text-[13px] font-bold text-primary">
                  {hovered.count.toLocaleString()}
                  <span className="text-[10px] font-normal text-muted-foreground">
                    {hovered.count === 1 ? label.replace(/s$/, '') : label}
                  </span>
                </p>
                <span className="absolute left-1/2 top-full size-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[2px] border-b border-r border-primary/20 bg-popover/95" />
              </div>
            </div>
          )}
        </div>
    </div>
  );
}
