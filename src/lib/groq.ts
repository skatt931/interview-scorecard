import { COMPETENCIES, STAGES, type ModelScorecard } from './scorecard'

const BASE = 'https://api.groq.com/openai/v1'

async function readError(res: Response) {
  const body = await res.text()
  try {
    return JSON.parse(body).error?.message ?? body
  } catch {
    return body || res.statusText
  }
}

export async function transcribe(audio: Blob, apiKey: string): Promise<string> {
  const form = new FormData()
  form.append('file', audio, 'recording.webm')
  form.append('model', 'whisper-large-v3-turbo')
  form.append('response_format', 'json')
  form.append('language', 'en')

  // Content-Type is intentionally unset so the browser adds the multipart boundary.
  const res = await fetch(`${BASE}/audio/transcriptions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  })
  if (!res.ok) throw new Error(`Transcription failed: ${await readError(res)}`)
  return (await res.json()).text
}

const stringOrEmpty = (options: readonly string[]) => ({
  type: 'string',
  enum: ['', ...options],
})

const schema = {
  type: 'object',
  additionalProperties: false,
  required: ['interviewee', 'stage', 'interviewer1', 'interviewer2', 'ratings', 'notes'],
  properties: {
    interviewee: { type: 'string', description: 'Candidate first name only, or "" if not stated' },
    stage: stringOrEmpty(STAGES),
    interviewer1: {
      type: 'string',
      description:
        'Name of the interviewer speaking / named first. Take whatever name is given, first name alone is fine. "" if genuinely not stated.',
    },
    interviewer2: {
      type: 'string',
      description:
        'Name of the other interviewer, e.g. from "me and Maria were on the call" -> "Maria". "" if not stated.',
    },
    notes: {
      type: 'string',
      description:
        'Free-form closing remarks from the interviewer speaking in this transcript, or ""',
    },
    ratings: {
      type: 'object',
      additionalProperties: false,
      required: COMPETENCIES.map((c) => c.id),
      properties: Object.fromEntries(
        COMPETENCIES.map((c) => [
          c.id,
          {
            type: 'object',
            additionalProperties: false,
            required: ['rating', 'notes'],
            properties: {
              rating: stringOrEmpty(c.options),
              notes: { type: 'string' },
            },
          },
        ]),
      ),
    },
  },
}

const SYSTEM = `You turn a spoken interview debrief into a structured interview scorecard.

Rules:
- Use only what the transcript actually says. Never invent ratings, names or examples.
- Leave a field as "" when the transcript does not cover it. An empty field is better than a guess.
- Rewrite the notes into concise, professional written English: full sentences, no filler, no "um", no first-person rambling. Keep concrete examples the interviewer gave.
- Each notes field should be 1-3 sentences.
- "interviewee" must be a first name only.
- Map loose spoken wording onto the allowed rating values (e.g. "he did fine" -> "OK", "strong yes" -> "Highly recommended").
- Map the round onto a stage value: theory/questions -> "1st tech round (Theory)", live coding/pairing/practical -> "2nd tech round Live coding", intro/culture/getting-to-know call -> "Chemistry check".
- Interviewer names: the speaker is interviewer1, anyone they mention sitting in ("me and Maria", "Maria was with me") is interviewer2. A bare first name is a valid answer - do not hold out for a surname.
- There is one voice in the transcript. Put its per-competency notes in "notes" for each competency and its closing remarks in the top-level "notes".
- The transcript may contain corrections recorded later, separated by "---". Later statements always override earlier ones for the same field.`

export async function structure(transcript: string, apiKey: string): Promise<ModelScorecard> {
  const res = await fetch(`${BASE}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'openai/gpt-oss-20b',
      temperature: 0,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: transcript },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'scorecard', strict: true, schema },
      },
    }),
  })
  if (!res.ok) throw new Error(`Structuring failed: ${await readError(res)}`)

  return JSON.parse((await res.json()).choices[0].message.content) as ModelScorecard
}
