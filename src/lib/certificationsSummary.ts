/** Parse newline-separated certification URLs for list UI (keeps empty rows for editing). */
export function parseCertificationLinks(summary: string | null | undefined): string[] {
  if (summary == null || summary === '') return ['']
  // Do not drop blank lines — the campaign form "Add certification" button needs them.
  const lines = summary.split(/\r?\n/).map((line) => line.trim())
  return lines.length ? lines : ['']
}

/** Serialize certification URL rows for the form editor (preserves empty slots). */
export function serializeCertificationLinks(links: string[]): string {
  if (!links.length) return ''
  return links.map((line) => line.trim()).join('\n')
}

/** Real certification URLs only (for display, PDF, scoring). */
export function certificationLinksFromSummary(summary: string | null | undefined): string[] {
  if (!summary?.trim()) return []
  return summary
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

/** Compact stored value before save (drops blank lines). */
export function normalizeCertificationsSummary(summary: string | null | undefined): string {
  return certificationLinksFromSummary(summary).join('\n')
}
