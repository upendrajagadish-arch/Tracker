import { Link } from '@tanstack/react-router'
import { Users } from 'lucide-react'
import { PlacementShell, usePlacementPaths } from '@/components/placement/PlacementShell'
import { Button } from '@/components/ui/button'
import { asPlacementPath } from '@/components/placement/PlacementLink'
import { useAuth } from '@/hooks/useAuth'

/** Lightweight interviewer entry — students & operations only. */
export function InterviewerHomePage() {
  const { base } = usePlacementPaths()
  const { placementProfile, user } = useAuth()
  const name =
    placementProfile?.full_name?.trim() || user?.email?.split('@')[0] || 'Interviewer'

  return (
    <PlacementShell>
      <div className="home-glass mx-auto max-w-2xl space-y-6 p-8 text-center">
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#FFD28A]">
          Interviewer workspace
        </p>
        <h1 className="font-heading text-[28px] font-bold text-white">Welcome, {name}</h1>
        <p className="text-[14px] leading-relaxed text-[#A1A1AA]">
          Review student dossiers and placement operations for campus interviews.
        </p>
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          {base ? (
            <>
              <Button asChild>
                <Link to={asPlacementPath(`${base}/students`)}>
                  <Users className="mr-1.5 size-4" />
                  Open students
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to={asPlacementPath(`${base}/operations`)}>Placement operations</Link>
              </Button>
            </>
          ) : null}
        </div>
      </div>
    </PlacementShell>
  )
}
