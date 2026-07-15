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
      <div className="flex flex-1 flex-col px-4 py-8 sm:px-6 md:px-8">
        <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center">
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden rounded-card border border-soft bg-card px-6 py-10 md:px-8"
          >
            <p className="text-[12px] text-muted">{path}</p>
            <p className="mt-3 font-heading text-[64px] font-bold tracking-tight text-binance">404</p>
            <p className="mt-2 text-[14px] text-secondary">
              This page doesn&apos;t exist — or the handle couldn&apos;t be found.
            </p>

            <div className="mt-8 divide-y divide-soft border-y border-soft">
              {ROUTES.map((route) => (
                <Link
                  key={route.to}
                  to={route.to}
                  className="group flex items-center gap-3 py-3.5 text-[14px] transition-colors hover:text-binance"
                >
                  <route.icon className="size-4 text-secondary group-hover:text-binance" strokeWidth={2} />
                  <span className="font-semibold text-foreground">{route.label}</span>
                  <span className="dot-leader" />
                  <span className="text-[12px] text-muted">{route.hint}</span>
                </Link>
              ))}
            </div>

            <p className="mt-6 text-[14px] text-secondary">
              Looking for someone&apos;s profile? Public handles live at{' '}
              <span className="text-foreground">
                {typeof window !== 'undefined' ? window.location.origin : ''}/&lt;username&gt;
              </span>
            </p>
          </motion.div>

          <AppFooter />
        </div>
      </div>
    </>
  )
}
