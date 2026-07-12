import { cn } from '@/lib/utils';

interface ActivityFilterOption {
  value: string;
  label: string;
}

interface Props {
  title: string;
  /** Kept for call-site compatibility; the editorial bar stays quiet. */
  description?: string;
  options: ActivityFilterOption[];
  value: string;
  onValueChange: (value: string) => void;
  years?: number[];
  selectedYear?: number | null;
  onYearChange?: (year: number) => void;
  meta?: string[];
}

/** Editorial window controls for the detail-page heatmaps — mono text buttons
 *  with an underline for the active state, matching the unified profile. */
export function ActivityFilterBar({
  title,
  options,
  value,
  onValueChange,
  years = [],
  selectedYear,
  onYearChange,
  meta = [],
}: Props) {
  const showYears = years.length > 0 && selectedYear != null && onYearChange;

  const buttonClass = (active: boolean) =>
    cn(
      'border-b pb-1 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors',
      active
        ? 'border-primary text-primary'
        : 'border-transparent text-muted-foreground/60 hover:text-foreground',
    );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground/70">
          {title}
        </span>

        <div className="flex flex-wrap items-baseline gap-4">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onValueChange(option.value)}
              className={buttonClass(option.value === value)}
            >
              {option.label}
            </button>
          ))}

          {showYears && (
            <>
              <span className="h-3 w-px self-center bg-border/70" />
              {years.map((year) => (
                <button
                  key={year}
                  type="button"
                  onClick={() => onYearChange(year)}
                  className={buttonClass(year === selectedYear)}
                >
                  {year}
                </button>
              ))}
            </>
          )}
        </div>
      </div>

      {meta.length > 0 && (
        <p className="font-mono text-[11px] text-muted-foreground">
          {meta.join(' · ')}
        </p>
      )}
    </div>
  );
}
