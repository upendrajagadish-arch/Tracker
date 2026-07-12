import { useEffect, useRef } from 'react';
import type { RatingPoint } from '../types/api';

interface Props {
  history: RatingPoint[];
  height?: number;
  color?: string;
}

export function RatingChart({ history, height = 72, color = 'var(--platform-codeforces)' }: Props) {
  const polyRef = useRef<SVGPolylineElement>(null);

  if (!history || history.length < 2) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <span className="text-xs text-[var(--color-muted)]">No rating history</span>
      </div>
    );
  }

  const ratings = history.map(p => p.newRating);
  const minR = Math.min(...ratings);
  const maxR = Math.max(...ratings);
  const range = maxR - minR || 1;
  const W = 600, H = height, PAD = 4;

  const points = ratings.map((r, i) => {
    const x = PAD + (i / (ratings.length - 1)) * (W - PAD * 2);
    const y = H - PAD - ((r - minR) / range) * (H - PAD * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  const areaPoints = `${PAD},${H} ${points} ${W - PAD},${H}`;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }} preserveAspectRatio="none">
        <defs>
          <linearGradient id={`grad-${color.replace(/[^a-z]/gi, '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <polyline points={areaPoints} fill={`url(#grad-${color.replace(/[^a-z]/gi, '')})`} stroke="none" />
        <polyline
          ref={polyRef}
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="rating-line"
          style={{ strokeDasharray: 9999, strokeDashoffset: 9999 }}
        />
      </svg>
      <RatingChartInit polyRef={polyRef} />
      <div className="flex justify-between text-[10px] font-mono text-[var(--color-faint)] mt-1 px-1">
        <span>{minR}</span>
        <span>{maxR}</span>
      </div>
    </div>
  );
}

function RatingChartInit({ polyRef }: { polyRef: React.RefObject<SVGPolylineElement | null> }) {
  useEffect(() => {
    const el = polyRef.current;
    if (!el) return;
    try {
      const len = (el as SVGGeometryElement).getTotalLength();
      el.style.strokeDasharray = String(len);
      el.style.strokeDashoffset = String(len);
    } catch {
      el.style.strokeDasharray = '9999';
      el.style.strokeDashoffset = '9999';
    }
  }, [polyRef]);
  return null;
}
