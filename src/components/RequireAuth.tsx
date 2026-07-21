import { useEffect, type ReactNode } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { LoaderCircle } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

export function RequireAuth({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const { user, isLoading } = useAuth()

  useEffect(() => {
    if (isLoading || user) return

    const next = `${window.location.pathname}${window.location.search}${window.location.hash}`
    void navigate({
      to: '/login',
      search: { next },
      replace: true,
    })
  }, [isLoading, navigate, user])

  if (isLoading || !user) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" />
          {isLoading ? 'Checking your session…' : 'Opening sign in…'}
        </div>
      </div>
    )
  }

  return children
}
