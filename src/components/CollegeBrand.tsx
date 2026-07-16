import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import {
  COLLEGE_LOGO_SRC,
  COLLEGE_NAME,
  COLLEGE_NAME_SHORT,
} from '@/lib/brand'

/** Compact college mark for headers / top-right chrome. */
export function CollegeLogo({
  className,
  height = 36,
  linkToHome = true,
}: {
  className?: string
  height?: number
  linkToHome?: boolean
}) {
  const img = (
    <img
      src={COLLEGE_LOGO_SRC}
      alt={`${COLLEGE_NAME_SHORT} logo`}
      height={height}
      className={cn('h-auto w-auto object-contain', className)}
      style={{ height, maxWidth: height * 4.2 }}
      loading="eager"
      decoding="async"
    />
  )

  if (!linkToHome) return img
  return (
    <Link to="/" aria-label={`${COLLEGE_NAME} home`} className="inline-flex shrink-0 items-center">
      {img}
    </Link>
  )
}

/** Full college wordmark stack for the landing hero. */
export function CollegeWordmark({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col items-start gap-2', className)}>
      <CollegeLogo height={52} linkToHome={false} />
      <div>
        <p className="font-heading text-[18px] font-bold leading-tight tracking-tight text-[#D27918] sm:text-[22px]">
          Ramachandra College of Engineering
        </p>
        <p className="mt-0.5 text-[12px] font-semibold uppercase tracking-[0.22em] text-[#F6465D]">
          Autonomous
        </p>
      </div>
    </div>
  )
}
