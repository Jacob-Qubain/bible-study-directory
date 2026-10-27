"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Leader tabs, with the current one highlighted (and announced as the current page). */
export function NavLinks({ links }: { links: { href: string; label: string }[] }) {
  const pathname = usePathname();
  // "My studies" also covers the study editor (/leader/studies/...).
  const isCurrent = (href: string) =>
    href === "/leader"
      ? pathname === "/leader" || pathname.startsWith("/leader/studies")
      : pathname === href || pathname.startsWith(`${href}/`);

  return links.map((l) => {
    const current = isCurrent(l.href);
    return (
      <Link
        key={l.href}
        href={l.href}
        aria-current={current ? "page" : undefined}
        className={`inline-flex min-h-10 items-center rounded-full px-4 text-sm font-medium transition-colors ${
          current ? "bg-accent-soft font-semibold text-accent" : "text-muted hover:bg-surface-2 hover:text-ink"
        }`}
      >
        {l.label}
      </Link>
    );
  });
}
