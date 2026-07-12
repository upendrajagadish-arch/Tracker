import { Skeleton } from '@/components/ui/skeleton'

/** Editorial detail-page skeleton: mimics the hero, stat band, and a couple
 *  of numbered section blocks so loading state matches the loaded layout. */
export function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      {/* hero */}
      <div className="flex flex-col gap-7 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="size-16 rounded-2xl" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-24 rounded-full" />
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <Skeleton className="h-3 w-20" />
          <div className="flex gap-8">
            <Skeleton className="h-12 w-20" />
            <Skeleton className="h-12 w-20" />
          </div>
        </div>
      </div>
      <div className="h-px w-full bg-border/60" />

      {/* numbered section */}
      {[0, 1, 2].map((i) => (
        <div key={i} className="pt-2">
          <div className="mb-5 flex items-baseline gap-3">
            <Skeleton className="h-3 w-5" />
            <Skeleton className="h-3 w-28" />
            <span className="h-px flex-1 bg-border/60" />
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
            {[0, 1, 2, 3].map((j) => (
              <div key={j} className="flex flex-col gap-1.5">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-20" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
