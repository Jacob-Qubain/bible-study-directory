/**
 * Shown the instant a leader tab is clicked (it's prefetched), while the
 * page's data loads, so switching tabs never looks frozen.
 */
export default function Loading() {
  return (
    <div className="grid gap-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <div className="grid gap-2">
        <div className="h-9 w-64 max-w-full animate-pulse rounded-lg bg-surface-2" />
        <div className="h-5 w-96 max-w-full animate-pulse rounded-lg bg-surface-2" />
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="grid gap-3 rounded-2xl border border-line bg-surface p-5">
          <div className="h-6 w-48 max-w-full animate-pulse rounded-lg bg-surface-2" />
          <div className="h-4 w-80 max-w-full animate-pulse rounded-lg bg-surface-2" />
          <div className="flex gap-2">
            <div className="h-10 w-24 animate-pulse rounded-full bg-surface-2" />
            <div className="h-10 w-24 animate-pulse rounded-full bg-surface-2" />
          </div>
        </div>
      ))}
    </div>
  );
}
