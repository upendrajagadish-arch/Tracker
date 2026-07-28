/** Parse newline-separated certification URLs for list UI. */
export function parseCertificationLinks(summary: string | null | undefined): string[] {
  if (!summary?.trim()) return ['']
  const lines = summary
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  return lines.length ? lines : ['']
}

/** Serialize certification URL rows to stored `certifications_summary`. */
export function serializeCertificationLinks(links: string[]): string {
  return links.map((line) => line.trim()).filter(Boolean).join('\n')
}

export function certificationLinksFromSummary(summary: string | null | undefined): string[] {
  if (!summary?.trim()) return []
  return summary
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}
