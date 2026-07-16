import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import {
  COLLEGE_LOGO_SRC,
  COLLEGE_NAME,
  COLLEGE_NAME_SHORT,
  TNP_CELL,
} from '@/lib/brand'

const SIZE = {
  sm: {
    logo: 28,
    gap: 'gap-2.5',
    title: 'text-[11px] sm:text-[12px]',
    subtitle: 'text-[10px]',
  },
  md: {
    logo: 36,
    gap: 'gap-3',
    title: 'text-[12px] sm:text-[13px]',
    subtitle: 'text-[11px]',
  },
  lg: {
    logo: 44,
    gap: 'gap-3.5',
    title: 'text-[13px] sm:text-[14px]',
    subtitle: 'text-[12px]',
  },
} as const

export type CollegeBrandSize = keyof typeof SIZE

/** Shared logo image — keep sizing identical everywhere. */
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
      width={Math.round(height * 3.6)}
      className={cn('block h-auto w-auto max-w-none shrink-0 object-contain object-left', className)}
      style={{ height, maxWidth: Math.round(height * 3.8) }}
      loading="eager"
      decoding="async"
    />
  )

  if (!linkToHome) return img
  return (
    <Link
      to="/"
      aria-label={`${COLLEGE_NAME} home`}
      className="inline-flex shrink-0 items-center leading-none"
    >
      {img}
    </Link>
  )
}

/**
 * Canonical college brand lockup used across the app:
 * logo (left) + Training and Placement Cell (same heading font / copper accent).
 */
export function CollegeBrandMark({
  size = 'md',
  className,
  showCollegeName = false,
  linkToHome = true,
}: {
  size?: CollegeBrandSize
  className?: string
  /** Extra line under T&P — usually off because the logo already includes the college name. */
  showCollegeName?: boolean
  linkToHome?: boolean
}) {
  const s = SIZE[size]

  return (
    <div className={cn('flex min-w-0 items-center', s.gap, className)}>
      <CollegeLogo height={s.logo} linkToHome={linkToHome} />
      <div className="min-w-0 leading-tight">
        <p
          className={cn(
            'font-heading font-bold uppercase tracking-[0.14em] text-binance',
            s.title,
          )}
        >
          {TNP_CELL}
        </p>
        {showCollegeName ? (
          <p
            className={cn(
              'mt-0.5 truncate font-heading font-semibold tracking-tight text-secondary',
              s.subtitle,
            )}
          >
            {COLLEGE_NAME}
          </p>
        ) : null}
      </div>
    </div>
  )
}

/** @deprecated Prefer CollegeBrandMark — kept for any older call sites. */
export function CollegeWordmark({ className }: { className?: string }) {
  return <CollegeBrandMark size="lg" className={className} linkToHome={false} />
}
