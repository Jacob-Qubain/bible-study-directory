"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SearchX } from "lucide-react";
import { NoFitCard } from "@/components/campus/no-fit-card";
import { FilterBar } from "./filter-bar";
import { StudyCard } from "./study-card";
import { applyFilters, EMPTY_FILTERS, filtersToSearch, type Filters } from "@/lib/filters";
import { nextMeeting } from "@/lib/schedule";
import { useNow } from "@/lib/use-now";
import type { CampusContact, Study, Tag } from "@/lib/types";

export function Directory({
  studies,
  tags,
  areas,
  initialFilters,
  serverNow,
  campusId,
  contacts,
}: {
  studies: Study[];
  tags: Tag[];
  areas: string[];
  initialFilters: Filters;
  serverNow: number;
  campusId: string;
  contacts: CampusContact[];
}) {
  const [filters, setFilters] = useState(initialFilters);
  const now = useNow(serverNow);

  function update(next: Filters) {
    setFilters(next);
    // Keep the URL shareable without a server round-trip.
    window.history.replaceState(null, "", `${window.location.pathname}${filtersToSearch(next)}`);
  }

  // Soonest meeting first: "what can I go to this week?"
  const results = useMemo(
    () =>
      applyFilters(studies, filters)
        .map((study) => ({ study, next: nextMeeting(study, now) }))
        .toSorted((a, b) => a.next.getTime() - b.next.getTime()),
    [studies, filters, now],
  );

  return (
    <div className="grid gap-8">
      <FilterBar filters={filters} onChange={update} tags={tags} areas={areas} />

      <section aria-labelledby="results-heading" className="grid gap-4">
        <h2 id="results-heading" className="text-sm text-muted" aria-live="polite">
          {results.length === 1 ? "1 study" : `${results.length} studies`}, soonest first
        </h2>

        {results.length > 0 ? (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {results.map(({ study }) => (
              <li key={study.id}>
                <StudyCard study={study} now={now} />
              </li>
            ))}
          </ul>
        ) : studies.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line px-6 py-14 text-center">
            <p className="font-display text-lg font-semibold">No studies listed here yet.</p>
            <p className="max-w-sm text-muted">Leading one? It takes about two minutes to list it.</p>
            <Link
              href="/leader"
              className="mt-2 inline-flex min-h-11 items-center rounded-full bg-accent px-5 font-semibold text-accent-ink hover:bg-accent-hover"
            >
              List a study
            </Link>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line px-6 py-14 text-center">
            <SearchX className="size-8 text-muted" aria-hidden />
            <p className="font-display text-lg font-semibold">No studies match all of those.</p>
            <p className="max-w-sm text-muted">
              Try removing a filter or two — there {studies.length === 1 ? "is 1 group" : `are ${studies.length} groups`}{" "}
              meeting every week. Or tell us when you&apos;re free, below.
            </p>
            <button
              type="button"
              onClick={() => update(EMPTY_FILTERS)}
              className="mt-2 inline-flex min-h-11 items-center rounded-full bg-accent px-5 font-semibold text-accent-ink hover:bg-accent-hover"
            >
              Show all studies
            </button>
          </div>
        )}
      </section>

      <NoFitCard campusId={campusId} contacts={contacts} days={filters.days} times={filters.times} />
    </div>
  );
}
