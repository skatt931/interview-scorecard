import { useEffect, useState } from 'react'
import { useApiKey } from '../auth/AuthGate'
import { Backdrop } from '../components/Backdrop'
import { Hints } from '../components/Hints'
import { Recorder } from '../components/Recorder'
import { Segmented, Stacked } from '../components/Rating'
import { Button, Field, Kbd, Label, MOD, QuietInput, TextArea } from '../components/ui'
import { structure, transcribe } from '../lib/groq'
import { downloadPdf } from '../lib/pdf'
import {
  COMPETENCIES,
  STAGES,
  emptyScorecard,
  merge,
  type CompetencyId,
  type Scorecard as Data,
} from '../lib/scorecard'

type Status = 'idle' | 'transcribing' | 'structuring'

const CARD = 'rounded-3xl bg-white shadow-card'

export function Scorecard() {
  const apiKey = useApiKey()
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState('')
  const [transcript, setTranscript] = useState('')
  const [data, setData] = useState<Data>(emptyScorecard)
  const [settling, setSettling] = useState(false)
  // Open on a first visit, quiet on every one after.
  const [hints, setHints] = useState(() => !localStorage.getItem('hints-seen'))

  const busy = status !== 'idle'
  const canApply = !busy && !!transcript.trim()
  const rated = COMPETENCIES.filter((c) => data.ratings[c.id].rating).length

  const toggleHints = () => {
    localStorage.setItem('hints-seen', '1')
    setHints((v) => !v)
  }

  const set = <K extends keyof Data>(key: K, value: Data[K]) =>
    setData((d) => ({ ...d, [key]: value }))

  const setEntry = (id: CompetencyId, patch: Partial<Data['ratings'][CompetencyId]>) =>
    setData((d) => ({ ...d, ratings: { ...d.ratings, [id]: { ...d.ratings[id], ...patch } } }))

  async function run<T>(next: Status, fn: () => Promise<T>, then: (result: T) => void) {
    setStatus(next)
    setError('')
    try {
      then(await fn())
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setStatus('idle')
    }
  }

  const onRecorded = (audio: Blob) =>
    run('transcribing', () => transcribe(audio, apiKey), setTranscript)

  const onApply = () =>
    run('structuring', () => structure(transcript, apiKey), (result) => {
      setData((current) => merge(current, result))
      setSettling(true)
      setTimeout(() => setSettling(false), 1200)
    })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.metaKey && !e.ctrlKey) return
      if (e.key === 'Enter' && canApply) {
        e.preventDefault()
        onApply()
      }
      if (e.key.toLowerCase() === 's') {
        e.preventDefault()
        downloadPdf(data)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div className="flex min-h-dvh flex-col">
      <Backdrop />

      <header className="px-6 pt-8">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <h1 className="text-lg font-extrabold tracking-tight text-brand">Interview Scorecard</h1>
          <nav className="flex items-center gap-5 text-xs font-semibold text-stone-500">
            <button onClick={toggleHints} className="transition-colors hover:text-accent">
              {hints ? 'Hide' : 'How it works'}
            </button>
            <button
              onClick={() => {
                setData(emptyScorecard())
                setTranscript('')
              }}
              className="transition-colors hover:text-accent"
            >
              Reset
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 space-y-5 px-6 py-6">
        {hints && <Hints />}

        <section className={`${CARD} animate-rise space-y-4 p-7`} style={{ animationDelay: '60ms' }}>
          <Recorder onRecorded={onRecorded} disabled={busy} />
          <div className="relative">
            <TextArea
              rows={4}
              value={transcript}
              disabled={status === 'transcribing'}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Record, upload or type what you remember"
            />
            {status === 'transcribing' && (
              <span className="pointer-events-none absolute inset-x-4 top-3 animate-pulse text-sm text-stone-500">
                Listening back…
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <Button onClick={onApply} disabled={!canApply}>
              {status === 'structuring' ? 'Writing it up…' : 'Apply'}
            </Button>
            {error && <p className="animate-rise text-xs font-semibold text-bad">{error}</p>}
          </div>
        </section>

        <article
          className={`${CARD} animate-rise divide-y divide-stone-100 ${
            settling
              ? '[&_button]:animate-settle [&_input]:animate-settle [&_textarea]:animate-settle'
              : ''
          }`}
          style={{ animationDelay: '160ms' }}
        >
          <div className="space-y-7 p-8">
            <input
              value={data.interviewee}
              onChange={(e) => set('interviewee', e.target.value)}
              placeholder="Candidate first name"
              className="w-full border-0 bg-transparent text-4xl font-extrabold leading-tight tracking-[-0.03em] text-ink outline-none placeholder:font-bold placeholder:text-stone-300"
            />
            <div className="space-y-2">
              <Label>Stage</Label>
              <Segmented
                options={STAGES}
                value={data.stage}
                onChange={(stage) => set('stage', stage)}
              />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <Field label="1st interviewer">
                <QuietInput
                  value={data.interviewer1}
                  onChange={(e) => set('interviewer1', e.target.value)}
                />
              </Field>
              <Field label="2nd interviewer">
                <QuietInput
                  value={data.interviewer2}
                  onChange={(e) => set('interviewer2', e.target.value)}
                />
              </Field>
            </div>
          </div>

          <ol className="divide-y divide-stone-100">
            {COMPETENCIES.map((c) => (
              <li key={c.id} className="space-y-3 p-8">
                <h2 className="text-sm font-bold tracking-tight">{c.label}</h2>
                {c.id === 'overall' ? (
                  <Stacked
                    options={c.options}
                    value={data.ratings[c.id].rating}
                    onChange={(rating) => setEntry(c.id, { rating })}
                  />
                ) : (
                  <Segmented
                    options={c.options}
                    value={data.ratings[c.id].rating}
                    onChange={(rating) => setEntry(c.id, { rating })}
                  />
                )}
                <TextArea
                  rows={2}
                  value={data.ratings[c.id].notes}
                  onChange={(e) => setEntry(c.id, { notes: e.target.value })}
                  placeholder="Notes / examples"
                />
              </li>
            ))}
          </ol>

          <div className="space-y-5 p-8">
            <Field label="Notes from 1st interviewer (optional)">
              <TextArea
                rows={2}
                value={data.notes1}
                onChange={(e) => set('notes1', e.target.value)}
              />
            </Field>
            <Field label="Notes from 2nd interviewer (optional)">
              <TextArea
                rows={2}
                value={data.notes2}
                onChange={(e) => set('notes2', e.target.value)}
              />
            </Field>
          </div>
        </article>
      </main>

      <div className="sticky bottom-0 z-40 px-6 pb-5">
        <div
          className={`mx-auto flex max-w-3xl items-center justify-between rounded-2xl bg-white/85 px-5 py-3 shadow-lift backdrop-blur-md`}
        >
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              {COMPETENCIES.map((c) => (
                <span
                  key={c.id}
                  className={`size-2 rounded-full transition-colors duration-300 ${
                    data.ratings[c.id].rating ? 'bg-accent' : 'bg-stone-200'
                  }`}
                />
              ))}
            </div>
            <span className="text-xs font-semibold text-stone-500">
              {rated} of {COMPETENCIES.length} rated
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="hidden items-center gap-1.5 sm:flex">
              <Kbd>{MOD}</Kbd>
              <Kbd>S</Kbd>
            </span>
            <Button onClick={() => downloadPdf(data)}>Download PDF</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
