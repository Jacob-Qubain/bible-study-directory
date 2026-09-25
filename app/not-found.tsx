import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto grid max-w-md justify-items-center gap-4 px-4 py-24 text-center">
      <h1 className="font-display text-3xl font-semibold">We couldn&apos;t find that study.</h1>
      <p className="text-muted">It may have wrapped up for the season. There are plenty of others.</p>
      <Link
        href="/"
        className="inline-flex min-h-11 items-center rounded-full bg-accent px-5 font-semibold text-accent-ink hover:bg-accent-hover"
      >
        Browse all studies
      </Link>
    </div>
  );
}
