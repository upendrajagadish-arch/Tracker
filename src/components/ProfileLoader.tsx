import { useEffect, useState } from 'react'
import { Check, X } from 'lucide-react'

import type { ProfileCard } from '@/hooks/useCards'
import type { Platform } from '@/types/api'
import { cn } from '@/lib/utils'
import { PlatformIcon } from '@/components/PlatformIcon'

const PLATFORM_LABELS: Record<Platform, string> = {
  github: 'GitHub',
  leetcode: 'LeetCode',
  codeforces: 'Codeforces',
  gfg: 'GeeksForGeeks',
  codechef: 'CodeChef',
  hackerrank: 'HackerRank',
  tuf: 'takeUforward',
}

const PLATFORM_COLORS: Record<Platform, string> = {
  github: 'var(--platform-github)',
  leetcode: 'var(--platform-leetcode)',
  codeforces: 'var(--platform-codeforces)',
  gfg: 'var(--platform-gfg)',
  codechef: 'var(--platform-codechef)',
  hackerrank: 'var(--platform-hackerrank)',
  tuf: 'var(--platform-tuf)',
}

/**
 * Terminal-style boot loader for the unified profile.
 *
 * Reports how many platform sources have resolved (`x/y`) with a phosphor
 * progress bar and a per-source status list, then fades itself out a beat
 * after the last source settles. Purely presentational — it reflects the
 * card query states passed down; it never fetches.
 */
export function ProfileLoader({ cards }: { cards: ProfileCard[] }) {
  const total = cards.length
  const settled = cards.filter((c) => !c.isLoading).length
  const allSettled = total > 0 && settled === total

  // Two-phase exit: hold the completed frame briefly, fade, then unmount.
  const [leaving, setLeaving] = useState(false)
  const [gone, setGone] = useState(false)

  useEffect(() => {
    if (!allSettled) return
    const fade = setTimeout(() => setLeaving(true), 650)
    const unmount = setTimeout(() => setGone(true), 1150)
    return () => {
      clearTimeout(fade)
      clearTimeout(unmount)
    }
  }, [allSettled])

  if (gone || total === 0) return null

  const pct = Math.round((settled / total) * 100)
  const BLOCKS = 16
  const filled = Math.round((settled / total) * BLOCKS)

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`Loading profile sources: ${settled} of ${total} loaded`}
      className={cn(
        'fixed bottom-6 left-6 z-40 w-[min(19rem,calc(100vw-3rem))] transition-all duration-500 sm:bottom-8 sm:left-8',
        leaving ? 'translate-y-2 opacity-0' : 'translate-y-0 opacity-100',
      )}
    >
      <div className="term-window scanlines scan-sweep">
        {/* Title bar */}
        <div className="term-bar">
          <span className="term-dot" style={{ background: 'var(--term-red)' }} />
          <span className="term-dot" style={{ background: 'var(--term-amber)' }} />
          <span className="term-dot" style={{ background: 'var(--term-green)' }} />
          <span className="ml-2 truncate font-mono text-[11px] text-muted-foreground/80">
            {allSettled ? '~/profile — ready' : '~/profile — fetching'}
          </span>
        </div>

        <div className="crt-grid px-4 py-3.5">
          {/* Prompt line + counter */}
          <p className="flex items-baseline justify-between font-mono text-[11px]">
            <span className="text-muted-foreground">
              <span className="text-[var(--term-green)]">$ </span>
              {allSettled ? 'sources synced' : 'pulling sources'}
              {!allSettled && <span className="caret" />}
            </span>
            <span className="glow-text font-pixel text-sm text-[var(--term-green)] tabular-nums">
              {settled}/{total}
            </span>
          </p>

          {/* Phosphor progress bar */}
          <div className="mt-2.5 flex items-center gap-2">
            <span className="font-mono text-[11px] leading-none tracking-tight text-[var(--term-green)]">
              [
              <span className="text-[var(--term-green)]">{'█'.repeat(filled)}</span>
              <span className="text-muted-foreground/30">{'░'.repeat(BLOCKS - filled)}</span>
              ]
            </span>
            <span className="font-mono text-[10px] tabular-nums text-muted-foreground/60">{pct}%</span>
          </div>

          {/* Per-source status list */}
          <ul className="mt-3 space-y-1.5">
            {cards.map((c) => {
              const label = PLATFORM_LABELS[c.platform] ?? c.platform
              return (
                <li
                  key={`${c.platform}-${c.username}`}
                  className="flex items-center gap-2 font-mono text-[11px]"
                >
                  <PlatformIcon
                    platform={c.platform}
                    className="size-3 shrink-0"
                  />
                  <span
                    className={cn(
                      'min-w-0 flex-1 truncate transition-colors',
                      c.isLoading ? 'text-muted-foreground/70' : 'text-foreground',
                    )}
                    style={c.isError ? undefined : { color: c.isLoading ? undefined : PLATFORM_COLORS[c.platform] }}
                  >
                    {label}
                    <span className="ml-1.5 text-muted-foreground/40">@{c.username}</span>
                  </span>
                  {c.isLoading ? (
                    <span
                      className="size-1.5 shrink-0 animate-pulse rounded-full bg-[var(--term-amber)]"
                      aria-label="loading"
                    />
                  ) : c.isError ? (
                    <X className="size-3 shrink-0 text-[var(--term-red)]" aria-label="failed" />
                  ) : (
                    <Check className="size-3 shrink-0 text-[var(--term-green)]" aria-label="loaded" />
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </div>
  )
}
