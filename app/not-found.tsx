import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto grid max-w-md justify-items-center gap-4 px-4 py-24 text-center">
      <h1 className="font-display text-3xl font-semibold">We couldn&apos;t find that page.</h1>
      <p className="text-muted">The study or campus may have moved or wrapped up for the season.</p>
      <Link
        href="/"
        className="inline-flex min-h-11 items-center rounded-full bg-accent px-5 font-semibold text-accent-ink hover:bg-accent-hover"
      >
        Find a study
      </Link>
    </div>
  );
}
