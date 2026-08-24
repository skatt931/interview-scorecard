import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "./ui";

const BARS = 9;

const mimeType = () =>
  ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((t) =>
    MediaRecorder.isTypeSupported(t),
  );

const clock = (s: number) =>
  `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export function Recorder({
  onRecorded,
  disabled,
  aside,
}: {
  onRecorded: (audio: Blob) => void;
  disabled?: boolean;
  /** Rendered beside the button while idle. */
  aside?: ReactNode;
}) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");

  const recorder = useRef<MediaRecorder | null>(null);
  const audioCtx = useRef<AudioContext | null>(null);
  const frame = useRef(0);
  const bars = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    if (!recording) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [recording]);

  /** Drives the bars straight from the analyser, off the React render path. */
  function meter(stream: MediaStream) {
    const ctx = new AudioContext();
    audioCtx.current = ctx;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 128;
    analyser.smoothingTimeConstant = 0.75;
    ctx.createMediaStreamSource(stream).connect(analyser);

    const data = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteFrequencyData(data);
      bars.current.forEach((bar, i) => {
        if (!bar) return;
        // Low frequencies carry most of the voice, so weight the first bands.
        const from = Math.floor((i / BARS) ** 1.6 * 40) + 1;
        const slice = data.subarray(from, from + 4);
        const avg = slice.reduce((a, b) => a + b, 0) / slice.length;
        bar.style.transform = `scaleY(${Math.max(0.12, Math.min(1, avg / 120))})`;
      });
      frame.current = requestAnimationFrame(tick);
    };
    tick();
  }

  function teardown() {
    cancelAnimationFrame(frame.current);
    audioCtx.current?.close();
    audioCtx.current = null;
    bars.current.forEach(
      (bar) => bar && (bar.style.transform = "scaleY(0.12)"),
    );
  }

  useEffect(() => teardown, []);

  async function start() {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks: Blob[] = [];
      const mr = new MediaRecorder(stream, { mimeType: mimeType() });
      mr.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        teardown();
        onRecorded(new Blob(chunks, { type: mr.mimeType }));
      };
      mr.start();
      recorder.current = mr;
      meter(stream);
      setSeconds(0);
      setRecording(true);
    } catch {
      setError("Microphone access denied");
    }
  }

  function stop() {
    recorder.current?.stop();
    recorder.current = null;
    setRecording(false);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4">
        <Button
          type="button"
          onClick={recording ? stop : start}
          disabled={disabled}
          variant={recording ? 'danger' : 'ink'}
          className="flex items-center gap-2.5 tabular-nums"
        >
          <span className="relative flex size-2">
            {recording && (
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-white opacity-60" />
            )}
            <span className="relative inline-flex size-2 rounded-full bg-white" />
          </span>
          {recording ? `Stop · ${clock(seconds)}` : "Record"}
        </Button>

        <div
          className={`flex h-6 items-center gap-[3px] transition-opacity duration-500 ${
            recording ? "opacity-100" : "opacity-0"
          }`}
          aria-hidden
        >
          {Array.from({ length: BARS }, (_, i) => (
            <span
              key={i}
              ref={(el) => {
                bars.current[i] = el;
              }}
              className="h-5 w-[3px] origin-center rounded-full bg-accent"
              style={{ transform: "scaleY(0.12)" }}
            />
          ))}
        </div>

        {!recording && aside}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
