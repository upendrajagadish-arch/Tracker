import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDisplayDate(
  value: string | number | null | undefined,
  options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' },
) {
  if (value == null || value === '') return null

  const date = typeof value === 'number'
    ? new Date(value < 1_000_000_000_000 ? value * 1000 : value)
    : new Date(value)

  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString('en', options)
}

/** Native share sheet where available (mobile), clipboard copy otherwise.
 *  Cancelling the sheet counts as 'shared' — it isn't a failure to surface. */
export async function shareOrCopyUrl(url: string, title: string): Promise<'shared' | 'copied' | 'failed'> {
  try {
    if (navigator.share) {
      await navigator.share({ title, url })
      return 'shared'
    }
    await navigator.clipboard.writeText(url)
    return 'copied'
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') return 'shared'
    try {
      await navigator.clipboard.writeText(url)
      return 'copied'
    } catch {
      return 'failed'
    }
  }
}

/** Split a comma-separated account list ("user1, user2") into unique handles.
 *  Platform query params carry multiple stacked accounts this way. */
export function splitAccounts(value: string | null | undefined): string[] {
  if (!value) return []
  return [...new Set(value.split(',').map((s) => s.trim()).filter(Boolean))]
}

export function formatDurationShort(seconds: number | null | undefined) {
  if (!seconds || seconds < 0) return '0m'

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (hours === 0) return `${minutes}m`
  if (minutes === 0) return `${hours}h`
  return `${hours}h ${minutes}m`
}
