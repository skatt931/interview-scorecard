const STEPS = [
  'Record the debrief out loud, or upload an audio file.',
  'Check the transcript — names and technical terms are what Whisper gets wrong.',
  'Apply, and the fields below fill in.',
  'Fix anything by hand, then download the PDF.',
]

export function Hints() {
  return (
    <ol className="animate-rise grid gap-x-8 gap-y-3 rounded-3xl bg-cream/70 p-6 sm:grid-cols-2">
      {STEPS.map((step, i) => (
        <li key={step} className="flex gap-3 text-sm leading-snug text-stone-700">
          <span className="mt-px flex size-5 shrink-0 items-center justify-center rounded-full bg-brand/15 text-[11px] font-bold text-brand">
            {i + 1}
          </span>
          {step}
        </li>
      ))}
    </ol>
  )
}
