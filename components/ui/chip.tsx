"use client";

import type { ComponentProps } from "react";

/** Toggleable filter pill. Large touch target, announced as a pressed toggle. */
export function Chip({
  pressed,
  className = "",
  ...props
}: ComponentProps<"button"> & { pressed: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-medium whitespace-nowrap transition-colors ${
        pressed
          ? "border-accent bg-accent text-accent-ink"
          : "border-line bg-surface text-ink hover:border-accent/50 hover:bg-accent-soft"
      } ${className}`}
      {...props}
    />
  );
}
