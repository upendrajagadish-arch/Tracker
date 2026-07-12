// Hook layer over the unified card service.
//
// Components never call `fetch`/services directly — they consume these hooks,
// which own the React Query keys, enable/disable logic, and aggregation.

import { useMemo } from 'react'
import { useQuery, useQueries } from '@tanstack/react-query'
import type { Platform } from '../types/api'
import type { UnifiedCard } from '../types/unified'
import { fetchCard, ALL_PLATFORMS } from '../api/cards'
import { splitAccounts } from '../lib/utils'

const CARD_STALE_TIME = 45 * 60 * 1000

/** Single platform unified card. */
export function useCard(platform: Platform, username: string | undefined) {
  return useQuery({
    queryKey: ['card', platform, username],
    queryFn: () => fetchCard(platform, username!),
    enabled: !!username,
    staleTime: CARD_STALE_TIME,
  })
}

export interface ProfileCard {
  platform: Platform
  username: string
  card: UnifiedCard | undefined
  isLoading: boolean
  isError: boolean
  error: Error | null
}

/**
 * Fetch unified cards for every supplied account in parallel.
 * Accepts a partial `{ platform: usernames }` map where each value may hold
 * several comma-separated accounts; returns one entry per *account*, in
 * canonical platform order.
 */
export function useProfileCards(usernames: Partial<Record<Platform, string>>) {
  const active = useMemo(
    () =>
      ALL_PLATFORMS.flatMap((p) =>
        splitAccounts(usernames[p]).map((username) => ({ platform: p, username })),
      ),
    [usernames],
  )

  const results = useQueries({
    queries: active.map(({ platform, username }) => ({
      queryKey: ['card', platform, username],
      queryFn: () => fetchCard(platform, username),
      staleTime: CARD_STALE_TIME,
    })),
  })

  const cards: ProfileCard[] = active.map(({ platform, username }, i) => ({
    platform,
    username,
    card: results[i]?.data,
    isLoading: results[i]?.isLoading ?? false,
    isError: results[i]?.isError ?? false,
    error: (results[i]?.error as Error) ?? null,
  }))

  const isLoading = results.some((r) => r.isLoading)
  const loaded = cards.filter((c) => c.card).map((c) => c.card!) as UnifiedCard[]

  return { cards, loaded, isLoading, activeCount: active.length }
}
