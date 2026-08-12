import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { COMPETENCIES, type Scorecard } from './scorecard'

const MARGIN = 56

export function buildPdf(data: Scorecard): jsPDF {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const width = doc.internal.pageSize.getWidth()
  let y = MARGIN

  const line = (text: string, size: number, bold: boolean, gap: number) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal').setFontSize(size)
    doc.text(text, MARGIN, y)
    y += gap
  }

  const interviewers = [data.interviewer1, data.interviewer2].filter(Boolean).join(', ')

  line(`Interview Scorecard — ${data.interviewee || '—'}`, 16, true, 26)
  doc.setDrawColor(220).line(MARGIN, y - 12, width - MARGIN, y - 12)
  if (data.stage) line(`Stage: ${data.stage}`, 11, false, 16)
  if (interviewers) line(`Interviewer: ${interviewers}`, 11, false, 16)
  y += 10

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [['Competency', 'Dev Level / Rating', 'Notes / Examples']],
    body: COMPETENCIES.map((c) => [
      c.label,
      data.ratings[c.id].rating || '—',
      data.ratings[c.id].notes || '—',
    ]),
    styles: { font: 'helvetica', fontSize: 10, cellPadding: 8, lineColor: [222, 222, 222], lineWidth: 0.5, valign: 'top' },
    headStyles: { fillColor: [245, 245, 245], textColor: [23, 23, 23], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 110, fontStyle: 'bold' },
      1: { cellWidth: 120 },
    },
  })

  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 34

  const section = (heading: string, body: string) => {
    if (!body.trim()) return
    const wrapped = doc.splitTextToSize(body.trim(), width - MARGIN * 2) as string[]
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

const pad = (n: number) => String(n).padStart(2, '0')

/** "12 08 2026" — the day the scorecard is written up. */
const stamp = (d = new Date()) => `${pad(d.getDate())} ${pad(d.getMonth() + 1)} ${d.getFullYear()}`

export function downloadPdf(data: Scorecard) {
  const name = [data.interviewee.trim(), data.stage.trim(), stamp()]
    .filter(Boolean)
    .join(' ')
    // Strip only what a filesystem rejects; spaces and parentheses are wanted here.
    .replace(/[/\\:*?"<>|]/g, '')
  buildPdf(data).save(`${name}.pdf`)
}
