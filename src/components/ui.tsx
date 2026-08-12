import type { ComponentProps, ReactNode } from "react";

export const MOD = navigator.userAgent.includes("Mac") ? "⌘" : "Ctrl";

/** Empty fields sit back; filled ones come forward, so the page visibly completes. */
const base =
  "w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition duration-200 placeholder:text-stone-400 placeholder-shown:bg-stone-100/70 hover:border-stone-300 focus:border-accent focus:bg-white focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--color-accent)_14%,transparent)]";

/** Bottom rule only — for metadata that should read as text, not as a form. */
const quiet =
  "w-full border-0 border-b border-stone-300 bg-transparent pb-1.5 text-sm font-semibold text-ink outline-none transition-colors placeholder:font-normal placeholder:text-stone-400 hover:border-stone-400 focus:border-accent";

export const Input = ({
  className = "",
  ...props
}: ComponentProps<"input">) => (
  <input {...props} className={`${base} ${className}`} />
);

export const QuietInput = ({
  className = "",
  ...props
}: ComponentProps<"input">) => (
  <input {...props} className={`${quiet} ${className}`} />
);

export const TextArea = ({
  className = "",
  ...props
}: ComponentProps<"textarea">) => (
  <textarea
    {...props}
    className={`${base} resize-y leading-relaxed ${className}`}
  />
);

export const Label = ({ children }: { children: ReactNode }) => (
  <span className="block text-xs font-semibold text-stone-500 transition-colors group-focus-within:text-accent">
    {children}
  </span>
);

export const Field = ({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) => (
  <label className="group block space-y-2">
    <Label>{label}</Label>
    {children}
  </label>
);

export const Kbd = ({ children }: { children: ReactNode }) => (
  <kbd className="rounded-md border border-stone-300 bg-white px-1.5 py-px font-sans text-[10px] font-semibold text-stone-500">
    {children}
  </kbd>
);

export const Button = ({
  variant = "accent",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: "accent" | "ink" | "danger" }) => {
  const tone = {
    accent: "bg-accent hover:bg-accent-dark",
    ink: "bg-ink hover:bg-ink-soft",
    danger: "bg-coral hover:bg-coral-dark",
  }[variant];
  return (
    <button
      {...props}
      className={`rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition duration-200 hover:shadow-md active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 disabled:shadow-sm ${tone} ${className}`}
    />
  );
};
