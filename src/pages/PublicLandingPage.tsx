import { Link } from '@tanstack/react-router'
import { ArrowRight, LogIn, Trophy } from 'lucide-react'
import { SeoHead } from '@/components/SeoHead'
import { Button } from '@/components/ui/button'
import { BRAND_NAME } from '@/lib/brand'

export function PublicLandingPage() {
  return (
    <>
      <SeoHead
        title={`${BRAND_NAME} | Placement Intelligence`}
        description="Sign in to access placement intelligence and authenticated coding-platform tracking."
        url="https://codetrace.xyz"
      />

      <div className="relative flex flex-1 flex-col overflow-hidden bg-canvas">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, rgba(210,121,24,0.14), transparent 34%), radial-gradient(circle at 80% 80%, rgba(14,203,129,0.08), transparent 30%)',
          }}
        />

        <nav className="relative z-10 mx-4 mt-4 rounded-card border border-soft bg-card/90 backdrop-blur sm:mx-6 md:mx-8">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <Link to="/" className="font-heading text-lg font-bold tracking-tight text-foreground">
              {BRAND_NAME}
            </Link>
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" size="sm">
                <Link to="/public/leaderboard">
                  <Trophy className="size-4" />
                  Leaderboard
                </Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/login" search={{ next: '/app' }}>
                  <LogIn className="size-4" />
                  Login
                </Link>
              </Button>
            </div>
          </div>
        </nav>

        <main className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 items-center px-4 py-16 sm:px-6 md:px-8">
          <section className="w-full rounded-3xl border border-soft bg-card/80 px-6 py-14 text-center shadow-2xl backdrop-blur sm:px-10 md:py-20">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-[#D27918]/35 bg-[#D27918]/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-[#D27918]">
              Placement intelligence
            </div>
            <h1 className="mx-auto mt-6 max-w-3xl font-heading text-4xl font-black tracking-tight text-foreground sm:text-5xl md:text-6xl">
              Student performance,
              <span className="block text-[#D27918]">secured behind login.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-secondary sm:text-base">
              Authorized users can sign in to access placement dashboards, analytics, and coding-platform tracking.
            </p>

            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link to="/login" search={{ next: '/app' }}>
                  Login to continue
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
                <Link to="/public/leaderboard">
                  <Trophy className="size-4" />
                  View Leaderboard
                </Link>
              </Button>
            </div>
          </section>
        </main>

        <footer className="relative z-10 border-t border-soft px-4 py-5 text-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} {BRAND_NAME}
          </p>
        </footer>
      </div>
    </>
  )
}
