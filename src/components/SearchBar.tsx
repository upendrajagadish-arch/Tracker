import { useState, type FormEvent } from 'react'
import { Search, Plus, X, CornerDownLeft } from 'lucide-react'
import { useQueryStates, parseAsString } from 'nuqs'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { PlatformIcon } from './PlatformIcon'
import { HistoryInput } from './HistoryInput'
import { addHistoryToStorage } from '../hooks/useInputHistory'
import { splitAccounts } from '../lib/utils'
import { PLATFORM_LABEL, PLATFORM_ACCENT } from './platformMeta'
import { BRAND_SLUG } from '@/lib/brand'
import type { Platform, Usernames } from '../types/api'

interface Props {
  onSubmit: () => void
}

const FIELDS: { key: keyof Usernames; platform: Platform; placeholder: string }[] = [
  { key: 'github',     platform: 'github',     placeholder: 'username' },
  { key: 'leetcode',   platform: 'leetcode',   placeholder: 'username' },
  { key: 'codeforces', platform: 'codeforces', placeholder: 'handle' },
  { key: 'gfg',        platform: 'gfg',        placeholder: 'username' },
  { key: 'codechef',   platform: 'codechef',   placeholder: 'handle' },
  { key: 'hackerrank', platform: 'hackerrank', placeholder: 'username' },
  { key: 'tuf',        platform: 'tuf',        placeholder: 'username' },
]

export function SearchBar({ onSubmit }: Props) {
  const [values, setValues] = useQueryStates({
    github: parseAsString.withDefault(''),
    leetcode: parseAsString.withDefault(''),
    codeforces: parseAsString.withDefault(''),
    gfg: parseAsString.withDefault(''),
    codechef: parseAsString.withDefault(''),
    hackerrank: parseAsString.withDefault(''),
    tuf: parseAsString.withDefault(''),
  }, { history: 'replace' })

  const [draft, setDraft] = useState<Record<string, string>>({})

  const accountsOf = (key: keyof Usernames) => splitAccounts(values[key])
  const draftOf = (key: keyof Usernames) => (draft[key] ?? '').trim()

  const queuedCount = FIELDS.reduce(
    (n, { key }) => n + accountsOf(key).length + (draftOf(key) ? 1 : 0),
    0,
  )
  const hasAny = queuedCount > 0

  const stackAccount = (key: keyof Usernames, platform: Platform) => {
    const handle = draftOf(key)
    if (!handle) return
    const list = [...new Set([...accountsOf(key), handle])]
    setValues({ [key]: list.join(',') })
    addHistoryToStorage(platform, handle)
    setDraft((d) => ({ ...d, [key]: '' }))
  }

  const removeAccount = (key: keyof Usernames, handle: string) => {
    const list = accountsOf(key).filter((h) => h !== handle)
    setValues({ [key]: list.join(',') })
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!hasAny) return

    const next: Partial<Record<keyof Usernames, string>> = {}
    FIELDS.forEach(({ key, platform }) => {
      const list = [...new Set([...accountsOf(key), ...(draftOf(key) ? [draftOf(key)] : [])])]
      next[key] = list.join(',')
      list.forEach((handle) => addHistoryToStorage(platform, handle))
    })
    setValues(next)
    setDraft({})
    onSubmit()
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      {/* Panel header — terminal section label */}
      <div className="mb-4 flex items-center justify-between gap-4 px-1">
        <div className="flex items-center gap-3">
          <span className="glow-text font-pixel text-sm text-[var(--term-green)]">01</span>
          <span className="font-heading text-base font-semibold tracking-tight text-foreground">
            <span className="text-muted-foreground/40">## </span>enter_handles
          </span>
        </div>
        {queuedCount > 0 && (
          <span className="font-mono text-[10px] tabular-nums text-[var(--term-green)]">
            {queuedCount} queued
          </span>
        )}
      </div>

      {/* Panel — a terminal window that rhymes with the hero */}
      <div className="term-window">
        <div className="term-bar">
          <span className="truncate font-mono text-[11px] text-muted-foreground/80">
            ~/{BRAND_SLUG}/handles
          </span>
        </div>

        {/* platform-tinted accent — cycles through all supported sources */}
        <div
          className="h-px w-full"
          style={{
            background: `linear-gradient(90deg, ${PLATFORM_ACCENT.github} 0%, ${PLATFORM_ACCENT.leetcode} 16%, ${PLATFORM_ACCENT.codeforces} 32%, ${PLATFORM_ACCENT.gfg} 48%, ${PLATFORM_ACCENT.codechef} 64%, ${PLATFORM_ACCENT.hackerrank} 80%, ${PLATFORM_ACCENT.tuf} 100%)`,
          }}
        />

        <form onSubmit={handleSubmit} className="flex flex-col">
          {FIELDS.map(({ key, platform, placeholder }, i) => {
            const stacked = accountsOf(key)
            const accent = PLATFORM_ACCENT[platform]
            const hasDraft = draftOf(key) !== ''
            return (
              <div key={key}>
                <div
                  className="search-row flex items-center gap-3 px-4 py-3.5"
                  style={{ ['--row-accent' as string]: accent }}
                >
                  <div className="flex w-32 flex-shrink-0 items-center gap-2" style={{ color: accent }}>
                    <PlatformIcon platform={platform} className="size-4" />
                    <span className="font-mono text-xs font-medium">
                      {PLATFORM_LABEL[platform]}
                    </span>
                  </div>
                  <HistoryInput
                    platform={platform}
                    value={draft[key] ?? ''}
                    onChange={(val) => setDraft((d) => ({ ...d, [key]: val }))}
                    placeholder={stacked.length ? 'stack another account' : placeholder}
                    accent={accent}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => stackAccount(key, platform)}
                    disabled={!hasDraft}
                    title="Stack this account"
                    className="shrink-0 text-muted-foreground hover:text-primary disabled:opacity-25"
                  >
                    <Plus className="size-4" />
                  </Button>
                </div>

                {stacked.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 px-4 pb-3 pl-[9.25rem]">
                    {stacked.map((handle) => (
                      <span
                        key={handle}
                        className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-mono text-[10px]"
                        style={{ color: accent, borderColor: `color-mix(in srgb, ${accent} 30%, transparent)` }}
                      >
                        {handle}
                        <button
                          type="button"
                          onClick={() => removeAccount(key, handle)}
                          className="opacity-50 transition-opacity hover:opacity-100"
                          aria-label={`Remove ${handle}`}
                        >
                          <X className="size-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                {i < FIELDS.length - 1 && <Separator />}
              </div>
            )
          })}

          {/* Submit footer */}
          <div className="flex items-center gap-3 border-t border-border/50 bg-background/40 px-4 py-3.5">
            <Button
              type="submit"
              disabled={!hasAny}
              className="flex-1 rounded-md font-mono text-sm font-semibold tracking-tight"
            >
              <Search data-icon="inline-start" />
              {queuedCount > 0 ? `./trace --profiles ${queuedCount}` : './stack_profiles'}
            </Button>
            <kbd className="hidden items-center gap-1 rounded-md border border-border/60 bg-muted/40 px-2 py-1 font-mono text-[10px] text-muted-foreground/60 sm:flex">
              <CornerDownLeft className="size-3" /> Enter
            </kbd>
          </div>
        </form>
      </div>

      {/* Helper text — shell comments */}
      <div className="mt-3 flex items-center justify-center gap-4 font-mono text-[10px] text-muted-foreground/50">
        <span>{'// + stacks several accounts on one platform'}</span>
        <span className="h-3 w-px bg-border/60" />
        <span>{'// empty fields are skipped'}</span>
      </div>
    </div>
  )
}
