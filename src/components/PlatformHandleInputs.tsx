import { useState, type KeyboardEvent } from 'react'
import { Plus, X } from 'lucide-react'
import { PlatformIcon } from '@/components/PlatformIcon'
import { PLATFORM_ACCENT, PLATFORM_LABEL } from '@/components/platformMeta'
import { ALL_PLATFORMS } from '@/api/unifiedClient'
import { splitAccounts } from '@/lib/utils'
import type { Platform, Usernames } from '@/types/api'

const PLATFORM_PLACEHOLDERS: Record<Platform, string> = {
  github: 'octocat',
  leetcode: 'neal_wu',
  codeforces: 'tourist',
  gfg: 'sandeep_jain',
  codechef: 'gennady',
  hackerrank: 'shashank',
  tuf: 'striver',
}

/** Multi-id editor for a profile config: every platform is a chip list —
 *  type an id, press enter (or +) to stack it, × to drop it. The value stays
 *  the comma-joined `Usernames` shape the rest of the app already speaks. */
export function PlatformHandleInputs({ value, onChange }: {
  value: Usernames
  onChange: (next: Usernames) => void
}) {
  // In-progress text per platform, not yet committed to a chip.
  const [drafts, setDrafts] = useState<Partial<Record<Platform, string>>>({})

  const idsFor = (platform: Platform) => splitAccounts(value[platform])

  const commitDraft = (platform: Platform) => {
    const draft = (drafts[platform] ?? '').trim()
    if (!draft) return
    // splitAccounts also handles pasted comma-lists and dedupes.
    const merged = [...new Set([...idsFor(platform), ...splitAccounts(draft)])]
    onChange({ ...value, [platform]: merged.join(',') })
    setDrafts((prev) => ({ ...prev, [platform]: '' }))
  }

  const removeId = (platform: Platform, id: string) => {
    const rest = idsFor(platform).filter((existing) => existing !== id)
    onChange({ ...value, [platform]: rest.join(',') })
  }

  const handleKeyDown = (platform: Platform) => (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      // Enter adds a chip instead of submitting the surrounding form.
      event.preventDefault()
      commitDraft(platform)
    } else if (event.key === 'Backspace' && !(drafts[platform] ?? '')) {
      const ids = idsFor(platform)
      if (ids.length) removeId(platform, ids[ids.length - 1])
    }
  }

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        {ALL_PLATFORMS.map((platform) => {
          const ids = idsFor(platform)
          const draft = drafts[platform] ?? ''
          return (
            <div
              key={platform}
              className="rounded-lg border border-border/60 bg-card/40 px-3 py-2.5 transition-colors focus-within:border-primary/50"
            >
              <div className="flex items-center gap-2">
                <PlatformIcon platform={platform} className="size-3.5 shrink-0 opacity-70" />
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  {PLATFORM_LABEL[platform]}
                </span>
                {ids.length > 0 && (
                  <span
                    className="ml-auto font-mono text-[10px] tabular-nums"
                    style={{ color: PLATFORM_ACCENT[platform] }}
                  >
                    {ids.length} id{ids.length === 1 ? '' : 's'}
                  </span>
                )}
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {ids.map((id) => (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/60 py-0.5 pl-2.5 pr-1 font-mono text-[11px] text-foreground"
                  >
                    {id}
                    <button
                      type="button"
                      aria-label={`Remove ${id}`}
                      onClick={() => removeId(platform, id)}
                      className="grid size-4 place-items-center rounded-full text-muted-foreground/60 transition-colors hover:bg-destructive/15 hover:text-destructive"
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                ))}

                <input
                  value={draft}
                  onChange={(event) => setDrafts((prev) => ({ ...prev, [platform]: event.target.value }))}
                  onKeyDown={handleKeyDown(platform)}
                  onBlur={() => commitDraft(platform)}
                  placeholder={ids.length ? 'add another…' : PLATFORM_PLACEHOLDERS[platform]}
                  className="h-6 min-w-[90px] flex-1 border-0 bg-transparent p-0 font-mono text-sm outline-none placeholder:text-muted-foreground/50"
                />

                {draft.trim() && (
                  <button
                    type="button"
                    aria-label={`Add ${draft} to ${PLATFORM_LABEL[platform]}`}
                    onClick={() => commitDraft(platform)}
                    className="grid size-5 shrink-0 place-items-center rounded-full border border-primary/40 text-primary transition-colors hover:bg-primary/15"
                  >
                    <Plus className="size-3" />
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
      <p className="mt-2 font-mono text-[10px] text-muted-foreground/60">
        {'// '}press enter to stack an id — as many per platform as you like
      </p>
    </>
  )
}
