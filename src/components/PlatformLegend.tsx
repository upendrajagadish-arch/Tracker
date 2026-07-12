import { PlatformIcon } from './PlatformIcon'
import { PLATFORM_LABEL, PLATFORM_ACCENT } from './platformMeta'
import { ALL_PLATFORMS } from '@/api/cards'

/** Quiet row of platform pills shown under the search bar on the landing
 *  view. Doubles as a color key for the accent used throughout the app. */
export function PlatformLegend() {
  return (
    <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
      <span className="mr-1 font-mono text-[10px] text-muted-foreground/40">{'// tracked:'}</span>
      {ALL_PLATFORMS.map((platform) => {
        const accent = PLATFORM_ACCENT[platform]
        return (
          <span
            key={platform}
            className="legend-pill inline-flex items-center gap-1.5 rounded-md border border-border/60 px-2.5 py-1 font-mono text-[10px] text-muted-foreground"
            style={{ ['--pill-accent' as string]: accent }}
          >
            <span className="size-1.5 rounded-full" style={{ background: accent }} />
            <PlatformIcon platform={platform} className="size-3" />
            {PLATFORM_LABEL[platform]}
          </span>
        )
      })}
    </div>
  )
}
