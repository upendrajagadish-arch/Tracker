/** Communication evaluation: 25 criteria × 0–10 = 250 marks. */

export const MAX_SCORE = 250

export const SCORE_OPTIONS = [
  { value: 0, label: 'Not Observed' },
  { value: 1, label: 'Poor' },
  { value: 2, label: 'Poor' },
  { value: 3, label: 'Basic' },
  { value: 4, label: 'Basic' },
  { value: 5, label: 'Average' },
  { value: 6, label: 'Average' },
  { value: 7, label: 'Good' },
  { value: 8, label: 'Good' },
  { value: 9, label: 'Excellent' },
  { value: 10, label: 'Excellent' },
] as const

export type CriteriaKey =
  | 'open_body_posture_smile'
  | 'gestures_eye_contact'
  | 'fluency_in_english'
  | 'rate_of_speech'
  | 'pronunciation_clarity'
  | 'voice_modulation'
  | 'listening_skills'
  | 'body_language'
  | 'explanation_skills'
  | 'energy_enthusiasm'
  | 'content_quality_ideas'
  | 'subject_knowledge'
  | 'thought_process_creativity'
  | 'audience_orientation'
  | 'courtesy_politeness'
  | 'grooming'
  | 'confidence'
  | 'professionalism'
  | 'initiative'
  | 'leadership_skills'
  | 'teamwork'
  | 'analytical_critical_thinking'
  | 'problem_solving_ability'
  | 'persuasiveness'
  | 'time_management'

export const COMMUNICATION_SECTIONS: Array<{
  id: 'proficiency' | 'presentation' | 'behavioural'
  title: string
  maxTotal: number
  fields: Array<{ key: CriteriaKey; label: string; marks: number; uploadHeaders: string[] }>
}> = [
  {
    id: 'proficiency',
    title: 'Communication Proficiency',
    maxTotal: 80,
    fields: [
      {
        key: 'open_body_posture_smile',
        label: 'Open body posture and smile',
        marks: 10,
        uploadHeaders: ['openbodypostureandsmile', 'openbodyposturesmile', 'openbodyposture'],
      },
      {
        key: 'gestures_eye_contact',
        label: 'Gestures and eye-contact',
        marks: 10,
        uploadHeaders: ['gestureseyecontact', 'gesturesandeyecontact'],
      },
      {
        key: 'fluency_in_english',
        label: 'Fluency in English',
        marks: 10,
        uploadHeaders: ['fluencyinenglish'],
      },
      {
        key: 'rate_of_speech',
        label: 'Rate of speech',
        marks: 10,
        uploadHeaders: ['rateofspeech'],
      },
      {
        key: 'pronunciation_clarity',
        label: 'Pronunciation and clarity of words',
        marks: 10,
        uploadHeaders: ['pronunciationclarityofwords', 'pronunciationclarity'],
      },
      {
        key: 'voice_modulation',
        label: 'Voice modulation, tone and pitch of voice',
        marks: 10,
        uploadHeaders: ['voicemodulationtonepitchofvoice', 'voicemodulation'],
      },
      {
        key: 'listening_skills',
        label: 'Listening skills',
        marks: 10,
        uploadHeaders: ['listeningskills'],
      },
      {
        key: 'body_language',
        label: 'Body language',
        marks: 10,
        uploadHeaders: ['bodylanguage'],
      },
    ],
  },
  {
    id: 'presentation',
    title: 'Presentation Skills',
    maxTotal: 60,
    fields: [
      {
        key: 'explanation_skills',
        label: 'Explanation skills',
        marks: 10,
        uploadHeaders: ['explanationskills'],
      },
      {
        key: 'energy_enthusiasm',
        label: 'Energy and enthusiasm',
        marks: 10,
        uploadHeaders: ['energyenthusiasm', 'energyandenenthusiasm'],
      },
      {
        key: 'content_quality_ideas',
        label: 'Content and quality of ideas',
        marks: 10,
        uploadHeaders: ['contentqualityofideas', 'contentandqualityofideas'],
      },
      {
        key: 'subject_knowledge',
        label: 'Subject knowledge',
        marks: 10,
        uploadHeaders: ['subjectknowledge'],
      },
      {
        key: 'thought_process_creativity',
        label: 'Thought process / creativity',
        marks: 10,
        uploadHeaders: ['thoughtprocesscreativity', 'thoughtprocess'],
      },
      {
        key: 'audience_orientation',
        label: 'Audience orientation',
        marks: 10,
        uploadHeaders: ['audienceorientation', 'audienceoriented'],
      },
    ],
  },
  {
    id: 'behavioural',
    title: 'Behavioural Skills',
    maxTotal: 110,
    fields: [
      {
        key: 'courtesy_politeness',
        label: 'Courtesy / politeness',
        marks: 10,
        uploadHeaders: ['courtesypoliteness'],
      },
      { key: 'grooming', label: 'Grooming', marks: 10, uploadHeaders: ['grooming'] },
      { key: 'confidence', label: 'Confidence', marks: 10, uploadHeaders: ['confidence'] },
      {
        key: 'professionalism',
        label: 'Professionalism',
        marks: 10,
        uploadHeaders: ['professionalism'],
      },
      { key: 'initiative', label: 'Initiative', marks: 10, uploadHeaders: ['initiative'] },
      {
        key: 'leadership_skills',
        label: 'Leadership skills',
        marks: 10,
        uploadHeaders: ['leadershipskills'],
      },
      { key: 'teamwork', label: 'Teamwork', marks: 10, uploadHeaders: ['teamwork'] },
      {
        key: 'analytical_critical_thinking',
        label: 'Analytical and critical thinking',
        marks: 10,
        uploadHeaders: ['analyticalcriticalthinking', 'analyticalandcriticalthinking'],
      },
      {
        key: 'problem_solving_ability',
        label: 'Problem-solving ability',
        marks: 10,
        uploadHeaders: ['problemsolvingability', 'problemsolving'],
      },
      {
        key: 'persuasiveness',
        label: 'Persuasiveness',
        marks: 10,
        uploadHeaders: ['persuasiveness'],
      },
      {
        key: 'time_management',
        label: 'Time management',
        marks: 10,
        uploadHeaders: ['timemanagement'],
      },
    ],
  },
]

export const ALL_CRITERIA_KEYS: CriteriaKey[] = COMMUNICATION_SECTIONS.flatMap((s) =>
  s.fields.map((f) => f.key),
)

export function normalizeHeader(header: string): string {
  return String(header || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

export function findCriteriaKeyForHeader(normalizedHeader: string): CriteriaKey | null {
  for (const section of COMMUNICATION_SECTIONS) {
    for (const field of section.fields) {
      if (field.uploadHeaders.includes(normalizedHeader)) return field.key
      if (normalizeHeader(field.label) === normalizedHeader) return field.key
    }
  }
  return null
}

export function clampScore(value: unknown): number | null {
  const n = Number(value)
  if (Number.isNaN(n) || n < 0 || n > 10) return null
  return Math.round(n)
}

/** Grade bands use percentage (0–100). */
export function calculateGrade(percentage: number): string {
  if (percentage >= 90) return 'A+'
  if (percentage >= 80) return 'A'
  if (percentage >= 70) return 'B+'
  if (percentage >= 60) return 'B'
  if (percentage >= 50) return 'C'
  return 'Needs Improvement'
}

export type EvaluationScoreInput = Partial<Record<CriteriaKey, number>>

export function calculateEvaluationTotals(data: EvaluationScoreInput) {
  const scores = {} as Record<CriteriaKey, number>
  for (const key of ALL_CRITERIA_KEYS) {
    const clamped = clampScore(data[key])
    if (clamped === null) {
      throw new Error(`Invalid score for ${key}: must be 0–10`)
    }
    scores[key] = clamped
  }

  const sum = (keys: CriteriaKey[]) => keys.reduce((acc, key) => acc + scores[key], 0)
  const proficiencyKeys = COMMUNICATION_SECTIONS[0].fields.map((f) => f.key)
  const presentationKeys = COMMUNICATION_SECTIONS[1].fields.map((f) => f.key)
  const behaviouralKeys = COMMUNICATION_SECTIONS[2].fields.map((f) => f.key)

  const communication_proficiency_total = sum(proficiencyKeys)
  const presentation_skills_total = sum(presentationKeys)
  const behavioural_skills_total = sum(behaviouralKeys)
  const total_score =
    communication_proficiency_total + presentation_skills_total + behavioural_skills_total
  const percentage = Math.round((total_score / MAX_SCORE) * 100)
  const grade = calculateGrade(percentage)

  return {
    ...scores,
    communication_proficiency_total,
    presentation_skills_total,
    behavioural_skills_total,
    total_score,
    max_score: MAX_SCORE,
    percentage,
    grade,
  }
}

export function emptyScores(): Record<CriteriaKey, number> {
  return Object.fromEntries(ALL_CRITERIA_KEYS.map((key) => [key, 0])) as Record<
    CriteriaKey,
    number
  >
}
