import { timeOfDay } from "./schedule";
import type { Study, StudyFormat, TimeOfDay } from "./types";

/**
 * Directory filter state. Serialized to the URL (?day=2,3&time=evening&who=men)
 * so every filtered view is shareable and survives refresh.
 * Within a group, options are OR'd; across groups they're AND'd.
 */
export interface Filters {
  q: string;
  days: number[];
  times: TimeOfDay[];
  who: string[]; // audience tag slugs
  focus: string[]; // topic tag slugs
  formats: StudyFormat[];
  areas: string[];
}

export const EMPTY_FILTERS: Filters = {
  q: "",
  days: [],
  times: [],
  who: [],
  focus: [],
  formats: [],
  areas: [],
};

const TIMES: TimeOfDay[] = ["morning", "afternoon", "evening"];
const FORMATS: StudyFormat[] = ["in_person", "online", "hybrid"];

type ParamSource = Record<string, string | string[] | undefined>;

function list(v: string | string[] | undefined): string[] {
  const raw = Array.isArray(v) ? v.join(",") : (v ?? "");
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function parseFilters(params: ParamSource): Filters {
  const q = params.q;
  return {
    q: (Array.isArray(q) ? q[0] : q)?.slice(0, 100) ?? "",
    days: list(params.day)
      .map(Number)
      .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6),
    times: list(params.time).filter((t): t is TimeOfDay => TIMES.includes(t as TimeOfDay)),
    who: list(params.who),
    focus: list(params.focus),
    formats: list(params.format).filter((f): f is StudyFormat =>
      FORMATS.includes(f as StudyFormat),
    ),
    areas: list(params.area),
  };
}

export function filtersToSearch(f: Filters): string {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.days.length) p.set("day", f.days.join(","));
  if (f.times.length) p.set("time", f.times.join(","));
  if (f.who.length) p.set("who", f.who.join(","));
  if (f.focus.length) p.set("focus", f.focus.join(","));
  if (f.formats.length) p.set("format", f.formats.join(","));
  if (f.areas.length) p.set("area", f.areas.join(","));
  const s = p.toString().replaceAll("%2C", ",");
  return s ? `?${s}` : "";
}

export function activeFilterCount(f: Filters) {
  return (
    f.days.length +
    f.times.length +
    f.who.length +
    f.focus.length +
    f.formats.length +
    f.areas.length
  );
}

export function toggle<T>(values: T[], value: T): T[] {
  return values.includes(value) ? values.filter((v) => v !== value) : [...values, value];
}

export const ONLINE_AREA = "Online";

export function studyArea(study: Study) {
  return study.neighborhood ?? ONLINE_AREA;
}

export function applyFilters(studies: Study[], f: Filters): Study[] {
  const q = f.q.trim().toLowerCase();
  return studies.filter((s) => {
    if (f.days.length && !f.days.includes(s.dayOfWeek)) return false;
    if (f.times.length && !f.times.includes(timeOfDay(s.startTime))) return false;
    // Hybrid studies work for people looking for either in-person or online.
    if (f.formats.length && !f.formats.includes(s.format) && s.format !== "hybrid") return false;
    if (f.areas.length && !f.areas.includes(studyArea(s))) return false;
    if (f.who.length && !s.tags.some((t) => f.who.includes(t.slug))) return false;
    if (f.focus.length && !s.tags.some((t) => f.focus.includes(t.slug))) return false;
    if (q) {
      const haystack = [
        s.title,
        s.summary,
        s.curriculum,
        s.neighborhood,
        s.locationName,
        ...s.leaders.map((l) => l.name),
        ...s.tags.map((t) => t.label),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}
