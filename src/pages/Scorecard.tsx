import { useEffect, useState } from "react";
import { useApiKey } from "../auth/AuthGate";
import { Backdrop } from "../components/Backdrop";
import { Hints } from "../components/Hints";
import { Recorder } from "../components/Recorder";
import { Segmented, Stacked } from "../components/Rating";
import {
  Button,
  Field,
  Kbd,
  Label,
  MOD,
  Optional,
  QuietInput,
  Required,
  TextArea,
} from "../components/ui";
import { downloadHandoff, fromMarkdown } from "../lib/handoff";
import { structure, transcribe } from "../lib/groq";
import { downloadPdf } from "../lib/pdf";
import {
  COMPETENCIES,
  STAGES,
  emptyScorecard,
  isOptional,
  applyModel,
  requiredCompetencies,
  validate,
  type CompetencyId,
  type Slot,
  type Scorecard as Data,
} from "../lib/scorecard";

type Status = "idle" | "transcribing" | "structuring";

const CARD = "rounded-3xl bg-white shadow-card";

const PATHS = [
  "Download the final PDF",
  "Hand off to the 2nd interviewer",
] as const;

/** Interviewers are the same people most days, so stop making them retype it. */
const remembered = (key: string) => localStorage.getItem(key) ?? "";

const withNames = (): Data => ({
  ...emptyScorecard(),
  interviewer1: remembered("interviewer1"),
  interviewer2: remembered("interviewer2"),
});

export function Scorecard() {
  const apiKey = useApiKey();
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [transcript, setTranscript] = useState("");
  const [data, setData] = useState<Data>(withNames);
  const [settling, setSettling] = useState(false);
  const [path, setPath] = useState<(typeof PATHS)[number]>(PATHS[0]);
  const [hints, setHints] = useState(() => !localStorage.getItem("hints-seen"));
  // The imported first-interviewer scorecard, kept so Apply can attribute notes.
  const [baseline, setBaseline] = useState<Data | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const busy = status !== "idle";
  const canApply = !busy && !!transcript.trim();
  /** Loading a handoff makes you the second voice on this card. */
  const slot: Slot = baseline ? 2 : 1;
  const who1 = data.interviewer1.trim() || "1st interviewer";
  const who2 = data.interviewer2.trim() || "2nd interviewer";

  const issues = validate(data);
  const missing = new Set(issues.map((i) => i.id));
  const required = requiredCompetencies(data.stage);
  const ratedRequired = required.filter(
    (c) => data.ratings[c.id].rating,
  ).length;
  // Before a stage is chosen the rules are unknown, so stay quiet about them.
  const showMissing = !!data.stage;

  useEffect(() => {
    if (data.interviewer1)
      localStorage.setItem("interviewer1", data.interviewer1);
    if (data.interviewer2)
      localStorage.setItem("interviewer2", data.interviewer2);
  }, [data.interviewer1, data.interviewer2]);

  const toggleHints = () => {
    localStorage.setItem("hints-seen", "1");
    setHints((v) => !v);
  };

  const set = <K extends keyof Data>(key: K, value: Data[K]) =>
    setData((d) => ({ ...d, [key]: value }));

  const setEntry = (
    id: CompetencyId,
    patch: Partial<Data["ratings"][CompetencyId]>,
  ) =>
    setData((d) => ({
      ...d,
      ratings: { ...d.ratings, [id]: { ...d.ratings[id], ...patch } },
    }));

  const flash = () => {
    setSettling(true);
    setTimeout(() => setSettling(false), 1200);
  };

  async function run<T>(
    next: Status,
    fn: () => Promise<T>,
    then: (result: T) => void,
  ) {
    setStatus(next);
    setError("");
    try {
      then(await fn());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setStatus("idle");
    }
  }

  /** Append, never replace — a follow-up recording is a correction, not a restart. */
  const onRecorded = (audio: Blob) =>
    run(
      "transcribing",
      () => transcribe(audio, apiKey),
      (text) =>
        setTranscript((prev) =>
          prev.trim() ? `${prev.trim()}\n\n---\n\n${text}` : text,
        ),
    );

  const onApply = () =>
    run(
      "structuring",
      () => structure(transcript, apiKey),
      (result) => {
        setData((current) => applyModel(current, result, slot));
        flash();
      },
    );

  async function onImport(file: File) {
    const loaded = fromMarkdown(await file.text());
    if (!loaded) {
      setError("That file has no scorecard data in it.");
      return;
    }
    setError("");
    setData(loaded);
    setBaseline(loaded);
    setPath(PATHS[0]);
    flash();
  }

  const exporting = baseline ? PATHS[0] : path;
  const finish = () =>
    exporting === PATHS[0] ? downloadPdf(data) : downloadHandoff(data);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.metaKey && !e.ctrlKey) return;
      if (e.key === "Enter" && canApply) {
        e.preventDefault();
        onApply();
      }
      if (e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (!issues.length) finish();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="flex min-h-dvh flex-col">
      <Backdrop />

      <header className="px-6 pt-8">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <h1 className="text-lg font-extrabold tracking-tight text-brand">
            Interview Scorecard
          </h1>
          <nav className="flex items-center gap-5 text-xs font-semibold text-stone-500">
            <button
              onClick={toggleHints}
              className="transition-colors hover:text-accent"
            >
              {hints ? "Hide" : "How it works"}
            </button>
            {confirmReset ? (
              <span className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setData(withNames());
                    setTranscript("");
                    setError("");
                    setBaseline(null);
                    setConfirmReset(false);
                  }}
                  className="font-bold text-bad transition-colors hover:brightness-110"
                >
                  Erase everything
                </button>
                <button
                  onClick={() => setConfirmReset(false)}
                  className="text-stone-400 transition-colors hover:text-ink"
                >
                  Cancel
                </button>
              </span>
            ) : (
              <button
                onClick={() => setConfirmReset(true)}
                className="transition-colors hover:text-accent"
              >
                Reset
              </button>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 space-y-5 px-6 py-6">
        {hints && <Hints />}

        {baseline && (
          <div className="animate-rise flex flex-wrap items-center gap-x-2 gap-y-1 rounded-2xl bg-brand/8 px-5 py-3 text-xs text-stone-600">
            <span className="font-bold text-brand">
              Continuing {baseline.interviewer1.trim() || "the 1st interviewer"}
              &rsquo;s scorecard.
            </span>
            <span>
              Anything you record is added as the 2nd review — their notes are
              kept and labelled.
            </span>
            <button
              onClick={() => setBaseline(null)}
              className="font-semibold text-stone-400 transition-colors hover:text-ink"
            >
              Detach
            </button>
          </div>
        )}

        <section
          className={`${CARD} animate-rise space-y-4 p-7`}
          style={{ animationDelay: "60ms" }}
        >
          <Recorder
            onRecorded={onRecorded}
            disabled={busy}
            aside={
              <label className="cursor-pointer text-xs font-semibold text-stone-500 underline-offset-4 transition-colors hover:text-accent hover:underline">
                load a handoff file
                <input
                  type="file"
                  accept=".md,text/markdown,text/plain"
                  className="hidden"
                  disabled={busy}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (file) onImport(file);
                  }}
                />
              </label>
            }
          />
          <div className="relative">
            <TextArea
              rows={4}
              value={transcript}
              disabled={status === "transcribing"}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Record or type what you remember"
            />
            {status === "transcribing" && (
              <span className="pointer-events-none absolute inset-x-4 top-3 animate-pulse text-sm text-stone-500">
                Listening back…
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Button onClick={onApply} disabled={!canApply}>
              {status === "structuring" ? "Writing it up…" : "Apply"}
            </Button>
            {transcript.trim() && (
              <button
                onClick={() => setTranscript("")}
                className="text-xs font-semibold text-stone-500 transition-colors hover:text-accent"
              >
                Clear transcript
              </button>
            )}
            {error && (
              <p className="animate-rise text-xs font-semibold text-bad">
                {error}
              </p>
            )}
          </div>
        </section>

        <article
          className={`${CARD} animate-rise divide-y divide-stone-100 ${
            settling
              ? "[&_button]:animate-settle [&_input]:animate-settle [&_textarea]:animate-settle"
              : ""
          }`}
          style={{ animationDelay: "160ms" }}
        >
          <div className="space-y-7 p-8">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>Candidate first name</Label>
                {showMissing && missing.has("interviewee") && <Required />}
              </div>
              <input
                value={data.interviewee}
                onChange={(e) => set("interviewee", e.target.value)}
                placeholder="First name"
                className="w-full border-0 border-b-2 border-stone-200 bg-transparent pb-2 text-3xl font-bold tracking-[-0.03em] text-ink caret-accent outline-none transition-colors placeholder:text-2xl placeholder:font-medium placeholder:text-stone-300 hover:border-stone-300 focus:border-accent"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>Stage</Label>
                {missing.has("stage") && <Required />}
              </div>
              <Segmented
                options={STAGES}
                value={data.stage}
                onChange={(stage) => set("stage", stage)}
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>1st interviewer</Label>
                  {showMissing && missing.has("interviewer1") && <Required />}
                </div>
                <QuietInput
                  value={data.interviewer1}
                  onChange={(e) => set("interviewer1", e.target.value)}
                  placeholder="Full name"
                />
              </div>
              <Field label="2nd interviewer">
                <QuietInput
                  value={data.interviewer2}
                  onChange={(e) => set("interviewer2", e.target.value)}
                  placeholder="Full name"
                />
              </Field>
            </div>
          </div>

          <ol className="divide-y divide-stone-100">
            {COMPETENCIES.map((c) => {
              const optional = isOptional(data.stage, c.id);
              return (
                <li key={c.id} className="space-y-3 p-8">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold tracking-tight">
                      {c.label}
                    </h2>
                    {showMissing && missing.has(c.id) && <Required />}
                    {showMissing && optional && <Optional />}
                  </div>
                  {c.id === "overall" ? (
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
                  <div className="grid gap-4 sm:grid-cols-2">
                    {([1, 2] as const).map((n) => {
                      const key =
                        n === 1 ? ("notes1" as const) : ("notes2" as const);
                      const mine = n === slot;
                      return (
                        <div key={n} className="space-y-1.5">
                          <span
                            className={`text-[11px] font-semibold ${
                              mine ? "text-accent" : "text-stone-400"
                            }`}
                          >
                            {n === 1 ? who1 : who2}
                            {mine && " · you"}
                          </span>
                          <TextArea
                            rows={3}
                            value={data.ratings[c.id][key]}
                            onChange={(e) =>
                              setEntry(c.id, { [key]: e.target.value })
                            }
                            placeholder="Notes / examples"
                          />
                        </div>
                      );
                    })}
                  </div>
                </li>
              );
            })}
          </ol>

          <div className="space-y-5 p-8">
            <Field label={`Closing remarks — ${who1} (optional)`}>
              <TextArea
                rows={2}
                value={data.notes1}
                onChange={(e) => set("notes1", e.target.value)}
              />
            </Field>
            <Field label={`Closing remarks — ${who2} (optional)`}>
              <TextArea
                rows={2}
                value={data.notes2}
                onChange={(e) => set("notes2", e.target.value)}
              />
            </Field>
          </div>

          <div className="space-y-3 p-8">
            <Label>When you are done</Label>
            {baseline ? (
              // You are the second voice: there is no one left to hand off to.
              <p className="text-xs leading-relaxed text-stone-500">
                Both reviews are on this card, so the only step left is the PDF.
              </p>
            ) : (
              <>
                <Stacked
                  options={PATHS}
                  value={path}
                  onChange={(next) =>
                    next && setPath(next as (typeof PATHS)[number])
                  }
                />
                <p className="text-xs leading-relaxed text-stone-500">
                  {path === PATHS[0]
                    ? "Exports the finished scorecard as a PDF, ready for Workday."
                    : "Exports a Markdown file. The 2nd interviewer loads it here, adds their review, and downloads the PDF."}
                </p>
              </>
            )}
          </div>
        </article>
      </main>

      <div className="sticky bottom-0 z-40 px-6 pb-5">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 rounded-2xl bg-white/85 px-5 py-3 shadow-lift backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              {required.map((c) => (
                <span
                  key={c.id}
                  className={`size-2 rounded-full transition-colors duration-300 ${
                    data.ratings[c.id].rating ? "bg-accent" : "bg-stone-200"
                  }`}
                />
              ))}
            </div>
            <span className="text-xs font-semibold text-stone-500">
              {issues.length
                ? `${issues.length} required ${issues.length === 1 ? "field" : "fields"} left`
                : `${ratedRequired} of ${required.length} rated · ready`}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="hidden items-center gap-1.5 sm:flex">
              <Kbd>{MOD}</Kbd>
              <Kbd>S</Kbd>
            </span>
            <Button
              onClick={finish}
              disabled={!!issues.length}
              title={
                issues.length
                  ? `Still needed: ${issues.map((i) => i.label).join(", ")}`
                  : ""
              }
            >
              {exporting === PATHS[0] ? "Download PDF" : "Export handoff"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
