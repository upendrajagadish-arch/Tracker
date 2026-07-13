import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowLeft, Share2, Check, LogIn, UserCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { placementHomeForRole } from '@/lib/placementAuth'
import { isStaffPlacementRole } from '@/lib/placementStaff'
import { asPlacementPath } from '@/components/placement/PlacementLink'
import { cn } from '@/lib/utils'
import { BRAND_NAME } from '@/lib/brand'

interface Props {
  /** Where the back action points. Defaults to the dashboard. */
  backTo?: string
  /** Label for the back action. */
  backLabel?: string
  /** URL to share; omit to share the current page; pass null to hide share. */
  shareUrl?: string | null
  /** Title passed to the native share sheet. */
  shareTitle?: string
  className?: string
}

/** Shared terminal-titlebar header used across the app: traffic lights, the
 *  pixel CodeTrace wordmark, a back link and a share button (native share sheet
 *  where available, clipboard copy otherwise). */
export function AppHeader({
  backTo = '/app',
  backLabel = 'dashboard',
  shareUrl,
  shareTitle = BRAND_NAME,
  className,
}: Props) {
  const [copied, setCopied] = useState(false)
  const { user, placementRole } = useAuth()
  const placementHome = placementRole && isStaffPlacementRole(placementRole)
    ? placementHomeForRole(placementRole)
    : null

  const resolvedShareUrl =
    shareUrl === undefined
      ? (typeof window !== 'undefined' ? window.location.href : '')
      : shareUrl

  const handleShare = async () => {
    const url = resolvedShareUrl
    if (!url) return

    const copy = async () => {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }

    try {
      if (navigator.share) {
        await navigator.share({ title: shareTitle, url })
        return
      }
      await copy()
    } catch (err) {
      // Cancelling the native share sheet throws AbortError — not a failure.
      if (err instanceof Error && err.name === 'AbortError') return
      try { await copy() } catch { /* clipboard blocked — nothing more to do */ }
    }
  }

  return (
    <header className={cn('mb-8', className)}>
      <div className="term-window">
        <div className="term-bar flex-wrap gap-y-2">
          <span className="term-dot" style={{ background: 'var(--term-red)' }} />
          <span className="term-dot" style={{ background: 'var(--term-amber)' }} />
          <span className="term-dot" style={{ background: 'var(--term-green)' }} />
          <Link
            to="/"
            className="glow-text ml-2 font-pixel text-base text-foreground transition-opacity hover:opacity-80"
          >
            {BRAND_NAME}
          </Link>
          <div className="ml-auto flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="font-mono text-xs text-muted-foreground hover:text-primary"
            >
              <Link to={backTo}>
                <ArrowLeft data-icon="inline-start" />
                {backLabel}
              </Link>
            </Button>
            {resolvedShareUrl ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleShare}
                className="font-mono text-xs text-muted-foreground hover:text-primary"
              >
                {copied ? <Check data-icon="inline-start" /> : <Share2 data-icon="inline-start" />}
                {copied ? 'copied' : 'share'}
              </Button>
            ) : null}
            {placementHome ? (
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="font-mono text-xs text-muted-foreground hover:text-primary"
              >
                <Link to={asPlacementPath(placementHome)}>placement</Link>
              </Button>
            ) : null}
            {/* Auth entry point: account (userid + platform ids) when signed in, login otherwise */}
            {user ? (
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="font-mono text-xs text-muted-foreground hover:text-primary"
              >
                <Link to="/account">
                  <UserCircle2 data-icon="inline-start" />
                  account
                </Link>
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="font-mono text-xs text-muted-foreground hover:text-primary"
              >
                <Link to="/login">
                  <LogIn data-icon="inline-start" />
                  login
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
