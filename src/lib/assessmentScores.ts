/** Assessment (aptitude/verbal) scoring helpers — display only. */

export function clampPercentage(value: number): number {
  if (Number.isNaN(value)) return 0
  return Math.max(0, Math.min(100, Math.round(value)))
}

export function calculateAssessmentPercentage(score: number, maxScore: number): number {
  if (!(maxScore > 0)) throw new Error('Max score must be greater than 0')
  if (score < 0 || score > maxScore) throw new Error('Score must be between 0 and max score')
  return clampPercentage((score / maxScore) * 100)
}

/** Letter-style grade for aptitude/verbal percentages. */
export function calculateAssessmentGrade(percentage: number): string {
  const p = clampPercentage(percentage)
  if (p >= 90) return 'A+'
  if (p >= 80) return 'A'
  if (p >= 70) return 'B+'
  if (p >= 60) return 'B'
  if (p >= 50) return 'C'
  return 'Needs Improvement'
}

export function formatAssessmentTotals(input: {
  score: number
  maxScore: number
}): { score: number; max_score: number; percentage: number; grade: string } {
  const percentage = calculateAssessmentPercentage(input.score, input.maxScore)
  return {
    score: input.score,
    max_score: input.maxScore,
    percentage,
    grade: calculateAssessmentGrade(percentage),
  }
}
