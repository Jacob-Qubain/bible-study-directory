"use client";

import { useId, useState } from "react";
import { Moon, Search, SlidersHorizontal, Sun, Sunrise, X } from "lucide-react";
import { Chip } from "@/components/ui/chip";
import { FORMAT_LABELS } from "@/components/study-badges";
import { activeFilterCount, EMPTY_FILTERS, toggle, type Filters } from "@/lib/filters";
import type { StudyFormat, Tag, TimeOfDay } from "@/lib/types";

// Monday-first reads more naturally for a weekly planner.
const DAYS = [1, 2, 3, 4, 5, 6, 0].map((d) => ({
  value: d,
  short: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d],
}));

const TIMES: { value: TimeOfDay; label: string; icon: typeof Sun }[] = [
  { value: "morning", label: "Morning", icon: Sunrise },
  { value: "afternoon", label: "Afternoon", icon: Sun },
  { value: "evening", label: "Evening", icon: Moon },
];

const FORMATS = Object.entries(FORMAT_LABELS) as [StudyFormat, string][];

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  const id = useId();
  return (
    <div role="group" aria-labelledby={id} className="grid gap-2">
      <span id={id} className="text-xs font-semibold tracking-wide text-muted uppercase">
        {label}
      </span>
      {/* Scrolls sideways on phones, wraps on wider screens. */}
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        {children}
      </div>
    </div>
  );
}

export function FilterBar({
  filters,
  onChange,
  tags,
  areas,
}: {
  filters: Filters;
  onChange: (next: Filters) => void;
  tags: Tag[];
  areas: string[];
}) {
  const secondaryCount =
    filters.who.length + filters.focus.length + filters.formats.length + filters.areas.length;
  const [expanded, setExpanded] = useState(secondaryCount > 0);
  const set = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    onChange({ ...filters, [key]: value });

  const audience = tags.filter((t) => t.category === "audience");
  const topics = tags.filter((t) => t.category === "topic");

  return (
    <div className="grid gap-5">
      <label className="relative block">
        <span className="sr-only">Search studies</span>
        <Search
          className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted"
          aria-hidden
        />
        <input
          type="search"
          value={filters.q}
          onChange={(e) => set("q", e.target.value)}
          placeholder="Search by book, leader, neighborhood…"
          className="h-12 w-full rounded-full border border-line bg-surface pr-4 pl-12 text-base shadow-sm placeholder:text-muted focus:border-accent focus:outline-none"
        />
      </label>

      <Group label="Day">
        {DAYS.map((d) => (
          <Chip
            key={d.value}
            pressed={filters.days.includes(d.value)}
            onClick={() => set("days", toggle(filters.days, d.value))}
          >
            {d.short}
          </Chip>
        ))}
      </Group>

      <Group label="Time">
        {TIMES.map(({ value, label, icon: Icon }) => (
          <Chip
            key={value}
            pressed={filters.times.includes(value)}
            onClick={() => set("times", toggle(filters.times, value))}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </Chip>
        ))}
      </Group>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls="more-filters"
          onClick={() => setExpanded((v) => !v)}
          className="inline-flex min-h-10 items-center gap-2 rounded-full px-1 text-sm font-semibold text-accent hover:text-accent-hover"
        >
          <SlidersHorizontal className="size-4" aria-hidden />
          {expanded ? "Fewer filters" : "More filters"}
          {secondaryCount > 0 && (
            <span className="rounded-full bg-accent px-2 py-0.5 text-xs text-accent-ink">
              {secondaryCount}
            </span>
          )}
        </button>
        {(activeFilterCount(filters) > 0 || filters.q) && (
          <button
            type="button"
            onClick={() => onChange(EMPTY_FILTERS)}
            className="inline-flex min-h-10 items-center gap-1 rounded-full px-1 text-sm font-medium text-muted hover:text-ink"
          >
            <X className="size-4" aria-hidden />
            Clear all
          </button>
        )}
      </div>

      {expanded && (
        <div id="more-filters" className="grid gap-5">
          <Group label="Who it's for">
            {audience.map((t) => (
              <Chip
                key={t.slug}
                pressed={filters.who.includes(t.slug)}
                onClick={() => set("who", toggle(filters.who, t.slug))}
              >
                {t.label}
              </Chip>
            ))}
          </Group>
          <Group label="Focus">
            {topics.map((t) => (
              <Chip
                key={t.slug}
                pressed={filters.focus.includes(t.slug)}
                onClick={() => set("focus", toggle(filters.focus, t.slug))}
              >
                {t.label}
              </Chip>
            ))}
          </Group>
          <Group label="Format">
            {FORMATS.map(([value, label]) => (
              <Chip
                key={value}
                pressed={filters.formats.includes(value)}
                onClick={() => set("formats", toggle(filters.formats, value))}
              >
                {label}
              </Chip>
            ))}
          </Group>
          <Group label="Area">
            {areas.map((a) => (
              <Chip
                key={a}
                pressed={filters.areas.includes(a)}
                onClick={() => set("areas", toggle(filters.areas, a))}
              >
                {a}
              </Chip>
            ))}
          </Group>
        </div>
      )}
    </div>
  );
}
