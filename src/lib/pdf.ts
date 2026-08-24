import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { COMPETENCIES, dateStamp, type Entry, type Scorecard } from './scorecard'

const MARGIN = 56

/**
 * jsPDF wraps by splitting on ASCII spaces only, so any other Unicode whitespace
 * turns a whole paragraph into one unbreakable token — it then breaks mid-word and
 * spills out of the cell. Models emit U+00A0 and thin spaces often, so normalise
 * everything before it reaches the page.
 */
function clean(s: string): string {
  return s
    .normalize('NFC')
    .replace(/\r\n?/g, '\n')
    // Line/paragraph separators are real breaks; keep them as newlines.
    .replace(/[\u2028\u2029]/g, '\n')
    // Zero-width, bidi marks, word joiner, BOM and soft hyphen: invisible but break wrapping.
    .replace(/[\u200B-\u200F\u2060\uFEFF\u00AD]/g, '')
    // Non-breaking hyphen has no WinAnsi glyph.
    .replace(/\u2011/g, '-')
    // Every whitespace run that is not a newline collapses to one plain ASCII space.
    .replace(/[^\S\n]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .trim()
}

/** Same, but for places that must stay on one line. */
const inline = (s: string) => clean(s).replace(/\n+/g, ' ')

export function buildPdf(data: Scorecard): jsPDF {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const width = doc.internal.pageSize.getWidth()
  let y = MARGIN

  const line = (text: string, size: number, bold: boolean, gap: number) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal').setFontSize(size)
    doc.text(text, MARGIN, y)
    y += gap
  }

  const who1 = inline(data.interviewer1)
  const who2 = inline(data.interviewer2)
  const interviewers = [who1, who2].filter(Boolean).join(', ')

  /** Label each voice only when there are two of them; otherwise it is just noise. */
  const notesCell = (e: Entry) => {
    const a = clean(e.notes1)
    const b = clean(e.notes2)
    if (a && b) {
      return `${who1 || '1st interviewer'}: ${a}\n\n${who2 || '2nd interviewer'}: ${b}`
    }
    return a || b
  }

  const interviewee = inline(data.interviewee)
  const stage = inline(data.stage)

  line(`Interview Scorecard — ${interviewee || '—'}`, 16, true, 26)
  doc.setDrawColor(220).line(MARGIN, y - 12, width - MARGIN, y - 12)
  if (stage) line(`Stage: ${stage}`, 11, false, 16)
  if (interviewers) line(`Interviewer: ${interviewers}`, 11, false, 16)
  y += 10

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [['Competency', 'Dev Level / Rating', 'Notes / Examples']],
    body: COMPETENCIES.map((c) => [
      c.label,
      inline(data.ratings[c.id].rating) || '—',
      notesCell(data.ratings[c.id]) || '—',
    ]),
    styles: { font: 'helvetica', fontSize: 10, cellPadding: 8, lineColor: [222, 222, 222], lineWidth: 0.5, valign: 'top' },
    headStyles: { fillColor: [245, 245, 245], textColor: [23, 23, 23], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 110, fontStyle: 'bold' },
      1: { cellWidth: 120 },
    },
  })

  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 34

  const section = (heading: string, raw: string) => {
    const body = clean(raw)
    if (!body) return
    const wrapped = doc.splitTextToSize(body, width - MARGIN * 2) as string[]
    if (y + wrapped.length * 14 > doc.internal.pageSize.getHeight() - MARGIN) {
      doc.addPage()
      y = MARGIN
    }
    doc.setFont('helvetica', 'bold').setFontSize(11).text(heading, MARGIN, y)
    y += 18
    doc.setFont('helvetica', 'normal').setFontSize(10).text(wrapped, MARGIN, y)
    y += wrapped.length * 14 + 20
  }

  section('Notes from 1st interviewer', data.notes1)
  section('Notes from 2nd interviewer', data.notes2)

  return doc
}

export function downloadPdf(data: Scorecard) {
  const name = [inline(data.interviewee), inline(data.stage), dateStamp()]
    .filter(Boolean)
    .join(' ')
    // Strip only what a filesystem rejects; spaces and parentheses are wanted here.
    .replace(/[/\\:*?"<>|]/g, '')
  buildPdf(data).save(`${name}.pdf`)
}
