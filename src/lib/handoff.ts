import { COMPETENCIES, dateStamp, hydrate, type Scorecard } from './scorecard'

const MARKER = 'scorecard-data'

/** Table cells cannot hold pipes or newlines. */
const cell = (s: string) => (s.trim() || '—').replace(/\|/g, '\\|').replace(/\n+/g, '<br>')

const block = (s: string) => s.trim() || '_Not filled in._'

/**
 * A handoff file is readable Markdown for the human, with the exact state in an
 * HTML comment for the app. The comment is invisible in any Markdown preview, so
 * the second interviewer can read the file before loading it.
 */
export function toMarkdown(d: Scorecard): string {
  return [
    `# Interview Scorecard — ${d.interviewee.trim() || 'Candidate'}`,
    '',
    `**Stage:** ${d.stage || '—'}  `,
    `**1st interviewer:** ${d.interviewer1.trim() || '—'}  `,
    `**2nd interviewer:** ${d.interviewer2.trim() || '—'}`,
    '',
    '| Competency | Dev Level / Rating | Notes / Examples |',
    '| --- | --- | --- |',
    ...COMPETENCIES.map((c) => {
      const e = d.ratings[c.id]
      const who1 = d.interviewer1.trim() || '1st interviewer'
      const who2 = d.interviewer2.trim() || '2nd interviewer'
      const notes =
        e.notes1.trim() && e.notes2.trim()
          ? `${who1}: ${e.notes1}\n\n${who2}: ${e.notes2}`
          : e.notes1 || e.notes2
      return `| ${c.label} | ${cell(e.rating)} | ${cell(notes)} |`
    }),
    '',
    '## Notes from 1st interviewer',
    '',
    block(d.notes1),
    '',
    '## Notes from 2nd interviewer',
    '',
    block(d.notes2),
    '',
    '---',
    '',
    '_Load this file back into the Interview Scorecard app to continue._',
    '',
    `<!-- ${MARKER}`,
    JSON.stringify(d),
    '-->',
    '',
  ].join('\n')
}

/** Returns null when the file carries no scorecard payload. */
export function fromMarkdown(text: string): Scorecard | null {
  const match = text.match(/<!--\s*scorecard-data\s*([\s\S]*?)-->/)
  if (!match) return null
  try {
    // Route through hydrate so a truncated or older payload still yields a valid shape.
    return hydrate(JSON.parse(match[1].trim()) as Partial<Scorecard>)
  } catch {
    return null
  }
}

const filename = (d: Scorecard) =>
  [d.interviewee.trim(), d.stage, dateStamp(), 'handoff']
    .filter(Boolean)
    .join(' ')
    .replace(/[/\\:*?"<>|]/g, '') + '.md'

export function downloadHandoff(d: Scorecard) {
  const url = URL.createObjectURL(new Blob([toMarkdown(d)], { type: 'text/markdown;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename(d)
  a.click()
  URL.revokeObjectURL(url)
}
