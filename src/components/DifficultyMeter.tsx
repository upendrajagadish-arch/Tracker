import { useEffect, useState } from 'react';

interface Props {
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  totalEasy: number;
  totalMedium: number;
  totalHard: number;
}

function Bar({ solved, total, color, label }: { solved: number; total: number; color: string; label: string }) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => { const t = setTimeout(() => setAnimated(true), 16); return () => clearTimeout(t); }, []);
  const pct = total > 0 ? (solved / total) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs w-14 flex-shrink-0" style={{ color }}>{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-[var(--color-border)]">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: animated ? `${pct}%` : '0%', background: color }}
        />
      </div>
      <span className="text-xs font-mono text-[var(--color-muted)] w-16 text-right flex-shrink-0">
        {solved} / {total}
      </span>
    </div>
  );
}

export function DifficultyMeter({ easySolved, mediumSolved, hardSolved, totalEasy, totalMedium, totalHard }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <Bar solved={easySolved} total={totalEasy} color="#2db55d" label="Easy" />
      <Bar solved={mediumSolved} total={totalMedium} color="#ffa116" label="Medium" />
      <Bar solved={hardSolved} total={totalHard} color="#ef4444" label="Hard" />
    </div>
  );
}
