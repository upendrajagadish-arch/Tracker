import { Helmet } from 'react-helmet-async'

import { BRAND_NAME } from '@/lib/brand'

const SITE_NAME = BRAND_NAME
const DEFAULT_DESC = 'Aggregate your coding stats from GitHub, LeetCode, Codeforces, GeeksForGeeks, CodeChef, HackerRank, and takeUforward in one place.'
const DEFAULT_IMAGE = 'https://codetrace.xyz/og-image.png'
const SITE_URL = 'https://codetrace.xyz'

interface SeoHeadProps {
  title: string
  description?: string
  image?: string
  url?: string
  type?: 'website' | 'profile'
}

export function SeoHead({
  title,
  description = DEFAULT_DESC,
  image = DEFAULT_IMAGE,
  url = SITE_URL,
  type = 'website',
}: SeoHeadProps) {
  const fullTitle = title === SITE_NAME ? title : `${title} — ${SITE_NAME}`

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />

      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE_NAME} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      <link rel="canonical" href={url} />
    </Helmet>
  )
}
