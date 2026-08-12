/**
 * Soft organic shapes behind the content — the cream blob from the
 * Song2gether landing, used here as atmosphere rather than illustration.
 * The cream shape is crisp so it reads as deliberate; the purple washes
 * are blurred so they never compete with the cards.
 */
export function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className="absolute -left-[26%] -top-[38%] h-[64rem] w-[70rem] bg-cream"
        style={{ borderRadius: '46% 54% 62% 38% / 42% 46% 54% 58%' }}
      />
      <div
        className="absolute -bottom-[30%] -right-[22%] h-[46rem] w-[52rem] bg-brand-soft/25 blur-3xl"
        style={{ borderRadius: '58% 42% 38% 62% / 52% 38% 62% 48%' }}
      />
      <div
        className="absolute -top-[10%] right-[6%] h-[26rem] w-[30rem] bg-brand/10 blur-3xl"
        style={{ borderRadius: '52% 48% 44% 56% / 48% 56% 44% 52%' }}
      />
    </div>
  )
}
