import { Link, type LinkProps } from '@tanstack/react-router'
import type { ReactNode } from 'react'

/** TanStack Router requires static route paths; cast dynamic role-prefixed placement URLs. */
export function PlacementLink({
  href,
  children,
  className,
  params,
}: {
  href: string
  children: ReactNode
  className?: string
  params?: Record<string, string>
}) {
  return (
    <Link
      to={href as LinkProps['to']}
      params={params as LinkProps['params']}
      className={className}
    >
      {children}
    </Link>
  )
}

export function asPlacementPath(path: string): LinkProps['to'] {
  return path as LinkProps['to']
}
