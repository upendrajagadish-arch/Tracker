import type { Platform } from '@/types/api'
import { SiGithub, SiLeetcode, SiCodeforces, SiGeeksforgeeks, SiCodechef, SiHackerrank } from '@icons-pack/react-simple-icons'

interface Props {
  platform: Platform
  className?: string
}

export function PlatformIcon({ platform, className = 'size-4' }: Props) {
  if (platform === 'github') return <SiGithub className={className} aria-hidden="true" />
  if (platform === 'leetcode') return <SiLeetcode className={className} aria-hidden="true" />
  if (platform === 'codeforces') return <SiCodeforces className={className} aria-hidden="true" />
  if (platform === 'gfg') return <SiGeeksforgeeks className={className} aria-hidden="true" />
  if (platform === 'codechef') return <SiCodechef className={className} aria-hidden="true" />
  if (platform === 'hackerrank') return <SiHackerrank className={className} aria-hidden="true" />
  if (platform === 'tuf') {
    // takeUforward brand badge: dark disc, italic "TUF" wordmark, orange chevron.
    // A faint orange ring keeps the dark disc legible on dark backgrounds.
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="11.25" fill="#0a0a0c" stroke="#ff7a3d" strokeWidth="1.5" />
        <text
          x="10.4"
          y="15.7"
          fontFamily="Arial, Helvetica, sans-serif"
          fontSize="8.6"
          fontWeight={900}
          fontStyle="italic"
          letterSpacing="-0.6"
          textAnchor="middle"
          fill="#fafafa"
        >
          TUF
        </text>
        <path
          d="M17.3 10.9 19.7 13 17.3 15.1"
          fill="none"
          stroke="#ff7a3d"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }
  return null
}
