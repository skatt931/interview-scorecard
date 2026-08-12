type Tone = { on: string; dot: string }

const POSITIVE: Tone = { on: 'bg-good-bg text-good', dot: 'bg-good' }
const MIDDLE: Tone = { on: 'bg-mid-bg text-mid', dot: 'bg-mid' }
const NEGATIVE: Tone = { on: 'bg-bad-bg text-bad', dot: 'bg-bad' }

/** Seniority is not a verdict, so it stays uncoloured — only judgements get tone. */
const NEUTRAL: Tone = { on: 'bg-white text-ink shadow-sm', dot: 'bg-ink' }

const TONES: Record<string, Tone> = {
  Bad: NEGATIVE,
  OK: MIDDLE,
  Good: POSITIVE,
  'Not recommended to proceed': NEGATIVE,
  'Recommended with reservations': MIDDLE,
  'Highly recommended': POSITIVE,
}

const toneFor = (option: string) => TONES[option] ?? NEUTRAL

type Props = {
  options: readonly string[]
  value: string
  onChange: (value: string) => void
}

/** Clicking the active option clears it, so a mis-click is one click to undo. */
const toggle = (value: string, option: string) => (value === option ? '' : option)

export function Segmented({ options, value, onChange }: Props) {
  return (
    <div className="inline-flex gap-1 rounded-2xl bg-stone-100 p-1">
      {options.map((option) => {
        const active = value === option
        const tone = toneFor(option)
        return (
          <button
            key={option}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(toggle(value, option))}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition duration-200 active:scale-[0.97] ${
              active ? tone.on : 'text-stone-500 hover:text-ink'
            }`}
          >
            {option}
          </button>
        )
      })}
    </div>
  )
}

export function Stacked({ options, value, onChange }: Props) {
  return (
    <div className="space-y-2">
      {options.map((option) => {
        const active = value === option
        const tone = toneFor(option)
        return (
          <button
            key={option}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(toggle(value, option))}
            className={`flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left text-sm font-semibold transition duration-200 active:scale-[0.99] ${
              active ? tone.on : 'bg-stone-100 text-stone-500 hover:text-ink'
            }`}
          >
            <span
              className={`size-2 shrink-0 rounded-full transition-colors ${
                active ? tone.dot : 'bg-stone-300'
              }`}
            />
            {option}
          </button>
        )
      })}
    </div>
  )
}
