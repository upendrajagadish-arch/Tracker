import { Link } from '@tanstack/react-router'
import { SeoHead } from '@/components/SeoHead'
import { Home, LayoutDashboard, LogIn, UserCircle2 } from 'lucide-react'
import { AppFooter } from '@/components/AppFooter'
import { BRAND_SLUG } from '@/lib/brand'

const ROUTES = [
  { to: '/', label: '~/home', hint: `what ${BRAND_SLUG} is`, icon: Home },
  { to: '/app', label: '~/dashboard', hint: 'stack your accounts', icon: LayoutDashboard },
  { to: '/account', label: '~/account', hint: 'your userid & platform ids', icon: UserCircle2 },
  { to: '/login', label: '~/login', hint: 'save your trace', icon: LogIn },
] as const

/** Router-level 404 — any path that matches no route (and no public profile
 *  handle resolution) lands here. */
export function NotFoundPage() {

  const path = typeof window !== 'undefined' ? window.location.pathname : '/…'

  return (
    <>
      <SeoHead title="404" description="Page not found" />
      <div className="flex min-h-screen flex-col px-4 py-10 md:px-8">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center">
        <div className="term-window scanlines rise-in">
          <div className="term-bar">
            <span className="term-dot" style={{ background: 'var(--term-red)' }} />
            <span className="term-dot" style={{ background: 'var(--term-amber)' }} />
            <span className="term-dot" style={{ background: 'var(--term-green)' }} />
            <span className="ml-2 truncate font-mono text-[11px] text-muted-foreground/80">
              ~{path} — exit 127
            </span>
          </div>

          <div className="crt-grid px-6 py-10 md:px-10 md:py-12">
            <p className="glitch glow-text font-pixel text-7xl text-primary md:text-8xl" data-text="404">
              404
            </p>

            <div className="mt-6 space-y-1.5 font-mono text-sm text-muted-foreground">
              <p>
                <span className="text-[var(--term-green)]">$</span> cat {path}
              </p>
              <p className="text-destructive/90">cat: {path}: No such file or directory</p>
              <p className="pt-2">
                <span className="text-[var(--term-green)]">$</span> ls ~/{BRAND_SLUG}<span className="caret" />
              </p>
            </div>

            <div className="mt-6 divide-y divide-border/40 border-y border-border/40">
              {ROUTES.map((route) => (
                <Link
                  key={route.to}
                  to={route.to}
                  className="group flex items-center gap-3 py-3.5 font-mono text-sm transition-colors hover:text-primary"
                >
                  <route.icon className="size-4 text-muted-foreground/60 transition-colors group-hover:text-primary" />
                  <span className="text-foreground transition-colors group-hover:text-primary">{route.label}</span>
                  <span className="dot-leader" />
                  <span className="text-[11px] text-muted-foreground/60">{route.hint}</span>
                </Link>
              ))}
            </div>

            <p className="mt-6 font-mono text-[11px] text-muted-foreground/60">
              {'// '}looking for someone's profile? public handles live at
              <span className="text-muted-foreground"> {typeof window !== 'undefined' ? window.location.origin : ''}/&lt;username&gt;</span>
            </p>
          </div>
        </div>

        <AppFooter />
      </div>
    </div>
    </>
  )
}
