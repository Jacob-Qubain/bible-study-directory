"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Search } from "lucide-react";
import type { Campus } from "@/lib/types";

/** Searchable campus list; scales from a handful of campuses to hundreds. */
export function CampusPicker({ campuses }: { campuses: (Campus & { studyCount: number })[] }) {
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const matches = query
    ? campuses.filter((c) => `${c.name} ${c.city ?? ""}`.toLowerCase().includes(query))
    : campuses;

  return (
    <div className="grid gap-4">
      {campuses.length > 6 && (
        <label className="relative block">
          <span className="sr-only">Search campuses</span>
          <Search
            className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted"
            aria-hidden
          />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search for your school…"
            autoFocus
            className="h-12 w-full rounded-full border border-line bg-surface pr-4 pl-12 text-base shadow-sm placeholder:text-muted focus:border-accent focus:outline-none"
          />
        </label>
      )}

      {matches.length ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {matches.map((c) => (
            <li key={c.id}>
              <Link
                href={`/${c.slug}`}
                className="flex min-h-16 items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-5 py-4 shadow-sm transition hover:border-accent/50 hover:bg-accent-soft"
              >
                <span className="grid gap-0.5">
                  <span className="font-display text-lg font-semibold">{c.name}</span>
                  <span className="text-sm text-muted">
                    {[c.city, `${c.studyCount} ${c.studyCount === 1 ? "study" : "studies"}`]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
                <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-2xl border border-dashed border-line px-6 py-10 text-center text-muted">
          No campus matches “{q}” yet.
        </p>
      )}
    </div>
  );
}
