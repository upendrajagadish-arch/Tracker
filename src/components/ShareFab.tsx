import { useEffect, useState } from 'react'
import { Share2, Check, Loader2, X, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type Toast = { text: string; tone: 'success' | 'error' }

export interface ShareAction {
  key: string
  /** Menu row text, e.g. "share url with these params". */
  label: string
  icon?: LucideIcon
  onClick: () => void
}

interface Props {
  /** Single-action mode: fired when the button is pressed. */
  onClick?: () => void
  /** Menu mode: pressing the button opens these choices instead. */
  actions?: ShareAction[]
  /** Accessible label + resting tooltip (e.g. "Share profile"). */
  label: string
  /** Shows a spinner and blocks input while true. */
  busy?: boolean
  /** Transient confirmation pill — set to show, auto-dismisses after a beat. */
  toast?: Toast | null
  /** Notifies the parent when the toast has finished displaying. */
  onToastDone?: () => void
}

/** Icon-only floating action button for sharing, pinned to the bottom-right.
 *  With `actions` it opens a small menu (e.g. long URL vs short URL);
 *  otherwise it fires `onClick` directly. */
export function ShareFab({ onClick, actions, label, busy = false, toast, onToastDone }: Props) {
  const [hovered, setHovered] = useState(false)
  const [open, setOpen] = useState(false)
  // Once a toast's timer elapses we remember it here so it stops rendering,
  // without ever mirroring the prop into state synchronously.
  const [dismissed, setDismissed] = useState<Toast | null>(null)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => {
      setDismissed(toast)
      onToastDone?.()
    }, 2600)
    return () => clearTimeout(t)
  }, [toast, onToastDone])

  const activeToast = toast && toast !== dismissed ? toast : null
  const pill: { text: string; tone: Toast['tone'] | 'neutral' } | null = activeToast
    ? activeToast
    : hovered && !busy && !open
      ? { text: label, tone: 'neutral' }
      : null

  const handlePress = () => {
    if (actions?.length) setOpen((prev) => !prev)
    else onClick?.()
  }

  return (
    <div className="fixed bottom-6 right-6 z-40 flex items-center gap-3 sm:bottom-8 sm:right-8">
      {/* Click-away backdrop while the menu is open */}
      {open && (
        <div className="fixed inset-0 -z-10" onClick={() => setOpen(false)} aria-hidden />
      )}

      {/* Action menu, stacked above the button */}
      {actions && (
        <div
          className={cn(
            'absolute bottom-full right-0 mb-3 flex origin-bottom-right flex-col items-stretch gap-1.5 transition-all duration-200',
            open ? 'pointer-events-auto translate-y-0 scale-100 opacity-100' : 'pointer-events-none translate-y-2 scale-95 opacity-0',
          )}
        >
          {actions.map((action) => (
            <button
              key={action.key}
              type="button"
              onClick={() => {
                setOpen(false)
                action.onClick()
              }}
              className={cn(
                'flex items-center gap-2.5 whitespace-nowrap rounded-full border border-border/70 bg-popover/95 px-4 py-2.5',
                'font-mono text-[11px] text-muted-foreground shadow-lg backdrop-blur-md',
                'transition-colors hover:border-primary/40 hover:text-primary',
              )}
            >
              {action.icon && <action.icon className="size-3.5 shrink-0 text-primary/80" />}
              {action.label}
            </button>
          ))}
        </div>
      )}

      {/* Contextual label / confirmation pill, sliding in from the button */}
      <div
        className={cn(
          'pointer-events-none origin-right rounded-full border px-3.5 py-1.5 font-mono text-[11px] shadow-lg backdrop-blur-md transition-all duration-200',
          pill
            ? 'translate-x-0 scale-100 opacity-100'
            : 'translate-x-2 scale-95 opacity-0',
          pill?.tone === 'error'
            ? 'border-destructive/30 bg-destructive/10 text-destructive'
            : pill?.tone === 'success'
              ? 'border-primary/30 bg-primary/10 text-primary'
              : 'border-border/70 bg-popover/90 text-muted-foreground',
        )}
      >
        {pill?.text ?? label}
      </div>

      <button
        type="button"
        onClick={handlePress}
        disabled={busy}
        aria-label={label}
        aria-expanded={actions ? open : undefined}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
        className={cn(
          'group relative grid size-14 place-items-center rounded-full bg-primary text-primary-foreground',
          'shadow-lg shadow-primary/25 outline-none transition-all duration-200',
          'hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/40',
          'focus-visible:ring-4 focus-visible:ring-primary/40',
          'active:translate-y-0 disabled:opacity-70 disabled:hover:translate-y-0',
        )}
      >
        {/* soft aura */}
        <span
          className="pointer-events-none absolute inset-0 rounded-full opacity-0 blur-md transition-opacity duration-300 group-hover:opacity-60"
          style={{ background: 'radial-gradient(closest-side, var(--color-primary), transparent)' }}
          aria-hidden
        />
        <span className="relative grid place-items-center">
          {busy ? (
            <Loader2 className="size-5 animate-spin" />
          ) : activeToast?.tone === 'success' ? (
            <Check className="size-5" />
          ) : open ? (
            <X className="size-5" />
          ) : (
            <Share2 className="size-5" />
          )}
        </span>
      </button>
    </div>
  )
}
