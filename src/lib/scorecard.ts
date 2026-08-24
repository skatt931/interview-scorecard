export const STAGES = [
  '1st tech round (Theory)',
  '2nd tech round Live coding',
  'Chemistry check',
] as const

export type Stage = (typeof STAGES)[number]

const pad = (n: number) => String(n).padStart(2, '0')

/** "12 08 2026" — the day the scorecard is written up. */
export const dateStamp = (d = new Date()) =>
  `${pad(d.getDate())} ${pad(d.getMonth() + 1)} ${d.getFullYear()}`

export const COMPETENCIES = [
  { id: 'technicalSkills', label: 'Technical Skills', options: ['Junior', 'Mid', 'Senior'] },
  { id: 'communication', label: 'Communication', options: ['Bad', 'OK', 'Good'] },
  { id: 'problemSolving', label: 'Problem Solving', options: ['Bad', 'OK', 'Good'] },
  { id: 'culturalFit', label: 'Cultural Fit', options: ['Bad', 'OK', 'Good'] },
  {
    id: 'overall',
    label: 'Overall Recommendation',
    options: [
      'Highly recommended',
      'Recommended with reservations',
      'Not recommended to proceed',
    ],
  },
] as const

export type CompetencyId = (typeof COMPETENCIES)[number]['id']

/** One agreed rating, but each interviewer keeps their own notes. */
export type Entry = { rating: string; notes1: string; notes2: string }

export type Scorecard = {
  interviewee: string
  stage: string
  interviewer1: string
  interviewer2: string
  ratings: Record<CompetencyId, Entry>
  notes1: string
  notes2: string
}

/** Which interviewer is writing right now. */
export type Slot = 1 | 2

/**
 * What the model gives back: a single voice. It never has to know whose slot it
 * is filling — the app decides that from whether a handoff was loaded.
 */
export type ModelScorecard = {
  interviewee: string
  stage: string
  interviewer1: string
  interviewer2: string
  ratings: Record<CompetencyId, { rating: string; notes: string }>
  notes: string
}

/**
 * Competencies a given round does not have to rate. Overall Recommendation is
 * always required — it is the point of the scorecard.
 */
const OPTIONAL_RATINGS: Record<Stage, readonly CompetencyId[]> = {
  '1st tech round (Theory)': ['problemSolving'],
  '2nd tech round Live coding': ['culturalFit'],
  'Chemistry check': ['technicalSkills', 'problemSolving'],
}

export const isOptional = (stage: string, id: CompetencyId) =>
  id !== 'overall' && (OPTIONAL_RATINGS[stage as Stage] ?? []).includes(id)

export const requiredCompetencies = (stage: string) =>
  COMPETENCIES.filter((c) => !isOptional(stage, c.id))

export type Issue = { id: string; label: string }

/** Everything that must be filled before a scorecard can leave the app. */
export function validate(d: Scorecard): Issue[] {
  const issues: Issue[] = []
  if (!d.interviewee.trim()) issues.push({ id: 'interviewee', label: 'Candidate first name' })
  if (!d.stage) issues.push({ id: 'stage', label: 'Stage' })
  if (!d.interviewer1.trim()) issues.push({ id: 'interviewer1', label: '1st interviewer' })
  for (const c of requiredCompetencies(d.stage)) {
    if (!d.ratings[c.id]?.rating) issues.push({ id: c.id, label: c.label })
  }
  return issues
}

const emptyEntry = (): Entry => ({ rating: '', notes1: '', notes2: '' })

export const emptyScorecard = (): Scorecard => ({
  interviewee: '',
  stage: '',
  interviewer1: '',
  interviewer2: '',
  ratings: Object.fromEntries(COMPETENCIES.map((c) => [c.id, emptyEntry()])) as Record<
    CompetencyId,
    Entry
  >,
  notes1: '',
  notes2: '',
})

/** Force a parsed handoff payload into a complete, valid shape. */
export function hydrate(partial: Partial<Scorecard> | null | undefined): Scorecard {
  const base = emptyScorecard()
  if (!partial) return base
  return {
    ...base,
    ...partial,
    ratings: Object.fromEntries(
      COMPETENCIES.map((c) => {
        // Handoffs written before notes were split carried a single `notes` field.
        const raw = partial.ratings?.[c.id] as (Partial<Entry> & { notes?: string }) | undefined
        const { notes, ...rest } = raw ?? {}
        const entry = { ...emptyEntry(), ...rest }
        return [c.id, notes?.trim() && !entry.notes1 ? { ...entry, notes1: notes } : entry]
      }),
    ) as Record<CompetencyId, Entry>,
  }
}

/**
 * Fold a model result into the card, writing notes into the slot belonging to
 * whoever is reviewing. An empty field from the model never wipes typed input,
 * and the other interviewer's slot is never touched — so this is safe to re-run.
 */
export function applyModel(current: Scorecard, incoming: ModelScorecard, slot: Slot): Scorecard {
  const keep = (a: string | undefined, b: string) => a?.trim() || b
  const noteKey = slot === 1 ? ('notes1' as const) : ('notes2' as const)

  return {
    ...current,
    interviewee: keep(incoming.interviewee, current.interviewee),
    stage: keep(incoming.stage, current.stage),
    interviewer1: keep(incoming.interviewer1, current.interviewer1),
    interviewer2: keep(incoming.interviewer2, current.interviewer2),
    [noteKey]: keep(incoming.notes, current[noteKey]),
    ratings: Object.fromEntries(
      COMPETENCIES.map((c) => {
        const prev = current.ratings[c.id] ?? emptyEntry()
        const next = incoming.ratings?.[c.id] ?? { rating: '', notes: '' }
        return [
          c.id,
          {
            ...prev,
            rating: keep(next.rating, prev.rating),
            [noteKey]: keep(next.notes, prev[noteKey]),
          },
        ]
      }),
    ) as Record<CompetencyId, Entry>,
  }
}
