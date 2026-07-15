import { Link } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { SeoHead } from '@/components/SeoHead'
import { Home, LayoutDashboard, LogIn, UserCircle2 } from 'lucide-react'
import { AppFooter } from '@/components/AppFooter'
import { BRAND_NAME } from '@/lib/brand'

const ROUTES = [
  { to: '/', label: 'Home', hint: `what ${BRAND_NAME} is`, icon: Home },
  { to: '/app', label: 'Dashboard', hint: 'stack your accounts', icon: LayoutDashboard },
  { to: '/account', label: 'Account', hint: 'your userid & platform ids', icon: UserCircle2 },
  { to: '/login', label: 'Login', hint: 'placement office access', icon: LogIn },
] as const

export function NotFoundPage() {
  const path = typeof window !== 'undefined' ? window.location.pathname : '/…'

  return (
    <>
      <SeoHead title="404" description="Page not found" />
      <div className="flex min-h-screen flex-col px-4 py-10 md:px-8">
        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center">
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="panel-bevel overflow-hidden rounded-dialog"
          >
            <div className="border-b border-console bg-panel-dark/60 px-6 py-3">
              <p className="truncate text-[11px] font-bold uppercase tracking-[0.5px] text-secondary">{path}</p>
            </div>

            <div className="px-6 py-10 md:px-10">
              <p className="font-heading text-7xl text-primary md:text-8xl">404</p>
              <p className="mt-3 text-lg text-secondary">
                This page doesn&apos;t exist — or the handle couldn&apos;t be found.
              </p>

              <div className="mt-8 divide-y divide-console border-y border-console">
                {ROUTES.map((route) => (
                  <Link
                    key={route.to}
                    to={route.to}
                    className="group flex items-center gap-3 py-3.5 text-sm transition-transform duration-150 hover:translate-x-1"
                  >
                    <route.icon className="size-4 text-primary" strokeWidth={2} />
                    <span className="font-heading text-foreground">{route.label}</span>
                    <span className="dot-leader" />
                    <span className="text-xs text-secondary">{route.hint}</span>
                  </Link>
                ))}
              </div>

              <p className="mt-6 text-sm text-secondary">
                Looking for someone&apos;s profile? Public handles live at{' '}
                <span className="font-semibold text-foreground">
                  {typeof window !== 'undefined' ? window.location.origin : ''}/&lt;username&gt;
                </span>
              </p>
            </div>
          </motion.div>

          <AppFooter />
        </div>
      </div>
    </>
  )
}
