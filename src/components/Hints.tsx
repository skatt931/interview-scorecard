import { Kbd, Label, MOD } from "./ui";

const STEPS = [
  "Record the debrief out loud, or type it in.",
  "Check the transcript — Whisper mangles names and jargon.",
  "Apply, and the ratings and notes fill in.",
  "Fix anything by hand, then export.",
];

const NOTES = [
  "Record again to correct yourself — it appends, and the later take wins.",
  "Which ratings are required depends on the stage. Optional ones say so.",
  "Finish alone with a PDF, or hand off a file to the 2nd interviewer.",
  "Loading a handoff writes into your own notes column; theirs stays untouched.",
  "One shared rating per competency — the later editor sets it.",
  "Interviewer names are remembered. Reset asks before erasing.",
];

const TIPS = [
  "Keep debriefs to a few minutes — the Groq quota is shared by the whole team.",
  "Say the first name and which round it was; both get picked up.",
  "A blank field beats a guess — it leaves gaps rather than inventing examples.",
];

const Bullet = ({ tone }: { tone: string }) => (
  <span className={`mt-[7px] size-1.5 shrink-0 rounded-full ${tone}`} />
);

export function Hints() {
  return (
    <div className="animate-rise space-y-6 rounded-3xl bg-cream/70 p-6">
      <div className="grid gap-x-10 gap-y-6 sm:grid-cols-2">
        <div className="space-y-3">
          <Label>How it works</Label>
          <ol className="space-y-2.5">
            {STEPS.map((step, i) => (
              <li
                key={step}
                className="flex gap-3 text-sm leading-snug text-stone-700"
              >
                <span className="mt-px flex size-5 shrink-0 items-center justify-center rounded-full bg-brand/15 text-[11px] font-bold text-brand">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>

        <div className="space-y-3">
          <Label>Good to know</Label>
          <ul className="space-y-2.5">
            {NOTES.map((note) => (
              <li
                key={note}
                className="flex gap-3 text-sm leading-snug text-stone-700"
              >
                <Bullet tone="bg-brand/40" />
                {note}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="space-y-3 border-t border-stone-200/70 pt-5">
        <Label>Getting the best out of it</Label>
        <ul className="grid gap-2.5 text-sm leading-snug text-stone-700 sm:grid-cols-3 sm:gap-x-10">
          {TIPS.map((tip) => (
            <li key={tip} className="flex gap-3">
              <Bullet tone="bg-accent/50" />
              {tip}
            </li>
          ))}
        </ul>
        <p className="flex items-center gap-2 pt-1 text-xs text-stone-500">
          <Kbd>{MOD}</Kbd>
          <Kbd>↵</Kbd>
          apply
          <span className="px-1 text-stone-300">·</span>
          <Kbd>{MOD}</Kbd>
          <Kbd>S</Kbd>
          export
        </p>
      </div>
    </div>
  );
}
