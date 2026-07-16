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
  backTo?: string
  backLabel?: string
  shareUrl?: string | null
  shareTitle?: string
  className?: string
}

/** Sticky dark header — Binance-style product chrome. */
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
      if (err instanceof Error && err.name === 'AbortError') return
      try { await copy() } catch { /* clipboard blocked */ }
    }
  }

  return (
    <header className={cn('mb-6', className)}>
      <div className="app-nav-glass px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <Link
            to="/"
            className="font-heading text-[18px] font-bold tracking-tight text-foreground transition-colors hover:text-binance"
          >
            {BRAND_NAME}
          </Link>
          {/* College logo lives in AppFrame top-right chrome on every page. */}
          <div className="ml-auto flex flex-wrap items-center gap-1">
            <Button variant="ghost" size="sm" asChild>
              <Link to={backTo}>
                <ArrowLeft data-icon="inline-start" strokeWidth={2} />
                {backLabel}
              </Link>
            </Button>
            {resolvedShareUrl ? (
              <Button variant="ghost" size="sm" onClick={handleShare}>
                {copied ? <Check data-icon="inline-start" strokeWidth={2} /> : <Share2 data-icon="inline-start" strokeWidth={2} />}
                {copied ? 'copied' : 'share'}
              </Button>
            ) : null}
            {placementHome ? (
              <Button variant="secondary" size="sm" asChild>
                <Link to={asPlacementPath(placementHome)}>placement</Link>
              </Button>
            ) : null}
            {user ? (
              <Button variant="outline" size="sm" asChild>
                <Link to="/account">
                  <UserCircle2 data-icon="inline-start" strokeWidth={2} />
                  account
                </Link>
              </Button>
            ) : (
              <Button size="sm" asChild>
                <Link to="/login">
                  <LogIn data-icon="inline-start" strokeWidth={2} />
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
