import { Skeleton } from '@/components/ui/skeleton'

export function LoadingCard() {
  return (
    <div className="flex flex-col gap-4 p-6">
      <Skeleton className="h-7 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
      <div className="flex gap-3 mt-1">
        <Skeleton className="h-14 flex-1" />
        <Skeleton className="h-14 flex-1" />
        <Skeleton className="h-14 flex-1" />
      </div>
      <Skeleton className="h-2 w-full" />
      <Skeleton className="h-20 w-full" />
    </div>
  )
}
