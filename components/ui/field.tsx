import type { ReactNode } from "react";

export const inputClass =
  "h-12 w-full rounded-xl border border-line bg-background px-4 text-base placeholder:text-muted focus:border-accent focus:outline-none aria-[invalid=true]:border-warm";

export const buttonClass = {
  primary:
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-accent px-5 font-semibold text-accent-ink transition hover:bg-accent-hover disabled:opacity-60",
  secondary:
    "inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-line bg-surface px-4 text-sm font-semibold transition hover:border-accent/50 hover:bg-accent-soft disabled:opacity-60",
  quiet:
    "inline-flex min-h-10 items-center gap-1.5 rounded-full px-2 text-sm font-medium text-muted hover:text-ink",
};

/** Label + control + hint/error, wired up for screen readers. */
export function Field({
  id,
  label,
  hint,
  error,
  optional,
  children,
}: {
  id: string;
  label: string;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="grid content-start gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label} {optional && <span className="font-normal text-muted">(optional)</span>}
      </label>
      {children}
      {(error || hint) && (
        <p id={`${id}-desc`} className={`text-sm ${error ? "text-warm" : "text-muted"}`}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

/** Props that connect an input to its Field's description and error state. */
export function describedBy(id: string, error?: string, hint?: ReactNode) {
  return {
    id,
    name: id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error || hint ? `${id}-desc` : undefined,
  } as const;
}

export function Notice({ tone = "info", children }: { tone?: "info" | "warn"; children: ReactNode }) {
  return (
    <div
      role="status"
      className={`rounded-2xl border p-4 text-sm ${
        tone === "warn" ? "border-warm/30 bg-warm-soft" : "border-accent/20 bg-accent-soft"
      }`}
    >
      {children}
    </div>
  );
}
