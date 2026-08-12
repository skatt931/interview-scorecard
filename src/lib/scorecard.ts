export const STAGES = ['1st tech round (Theory)', '2nd tech round Live coding'] as const

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

export type Entry = { rating: string; notes: string }

export type Scorecard = {
  interviewee: string
  stage: string
  interviewer1: string
  interviewer2: string
  ratings: Record<CompetencyId, Entry>
  notes1: string
  notes2: string
}

/** The model returns "" for anything the transcript didn't cover; never let that wipe typed input. */
export function merge(current: Scorecard, incoming: Scorecard): Scorecard {
  const keep = (a: string, b: string) => a || b
  return {
    interviewee: keep(incoming.interviewee, current.interviewee),
    stage: keep(incoming.stage, current.stage),
    interviewer1: keep(incoming.interviewer1, current.interviewer1),
    interviewer2: keep(incoming.interviewer2, current.interviewer2),
    notes1: keep(incoming.notes1, current.notes1),
    notes2: keep(incoming.notes2, current.notes2),
    ratings: Object.fromEntries(
      COMPETENCIES.map((c) => [
        c.id,
        {
          rating: keep(incoming.ratings[c.id].rating, current.ratings[c.id].rating),
          notes: keep(incoming.ratings[c.id].notes, current.ratings[c.id].notes),
        },
      ]),
    ) as Record<CompetencyId, Entry>,
  }
}

export const emptyScorecard = (): Scorecard => ({
  interviewee: '',
  stage: '',
  interviewer1: '',
  interviewer2: '',
  ratings: Object.fromEntries(
    COMPETENCIES.map((c) => [c.id, { rating: '', notes: '' }]),
  ) as Record<CompetencyId, Entry>,
  notes1: '',
  notes2: '',
})
