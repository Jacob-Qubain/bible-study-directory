import type { Study, TimeOfDay } from "./types";

export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

const DAY_MS = 86_400_000;

interface WallClock {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  weekday: number; // 0 = Sunday
}

const formatters = new Map<string, Intl.DateTimeFormat>();

export function wallClock(instant: Date, timeZone: string): WallClock {
  let fmt = formatters.get(timeZone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      weekday: "short",
    });
    formatters.set(timeZone, fmt);
  }
  const parts = Object.fromEntries(fmt.formatToParts(instant).map((p) => [p.type, p.value]));
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    weekday: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(parts.weekday),
  };
}

/** Converts a wall-clock time in `timeZone` to a real instant (DST-aware). */
function zonedToInstant(y: number, m: number, d: number, h: number, min: number, timeZone: string) {
  const target = Date.UTC(y, m - 1, d, h, min);
  let guess = target;
  // Two passes settle the offset, including across DST transitions.
  for (let i = 0; i < 2; i++) {
    const w = wallClock(new Date(guess), timeZone);
    const seen = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute);
    guess += target - seen;
  }
  return new Date(guess);
}

function parseTime(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return { hour: h, minute: m };
}

/**
 * Next start time strictly after `now` (a meeting in progress still counts
 * until it ends), never before the study's first meeting.
 */
export function nextMeeting(study: Study, now: Date = new Date()): Date {
  const { hour, minute } = parseTime(study.startTime);
  const today = wallClock(now, study.timezone);
  // Day arithmetic on a UTC-midnight "calendar date" avoids timezone drift.
  const todayDate = Date.UTC(today.year, today.month - 1, today.day);
  const anchor = Date.parse(`${study.anchorDate}T00:00:00Z`);
  const from = Math.max(todayDate, anchor);

  let offset = (study.dayOfWeek - new Date(from).getUTCDay() + 7) % 7;
  for (let attempts = 0; attempts < 4; attempts++, offset += 7) {
    const date = from + offset * DAY_MS;
    if (study.cadence === "biweekly") {
      const weeks = Math.round((date - anchor) / (7 * DAY_MS));
      if (((weeks % 2) + 2) % 2 !== 0) continue;
    }
    const d = new Date(date);
    const start = zonedToInstant(
      d.getUTCFullYear(),
      d.getUTCMonth() + 1,
      d.getUTCDate(),
      hour,
      minute,
      study.timezone,
    );
    const end = start.getTime() + study.durationMinutes * 60_000;
    if (end > now.getTime()) return start;
  }
  throw new Error(`Could not compute next meeting for ${study.slug}`);
}

function formatDate(isoDate: string, opts: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", ...opts }).format(
    new Date(`${isoDate}T00:00:00Z`),
  );
}

function localIsoDate(now: Date, timeZone: string) {
  const w = wallClock(now, timeZone);
  return `${w.year}-${String(w.month).padStart(2, "0")}-${String(w.day).padStart(2, "0")}`;
}

/** "Meeting since September 2, 2026" or, for a study that hasn't begun, "Starts Thursday, October 1". */
export function startedLabel(study: Study, now: Date) {
  if (study.anchorDate > localIsoDate(now, study.timezone)) {
    return `Starts ${formatDate(study.anchorDate, { weekday: "long", month: "long", day: "numeric" })}`;
  }
  return `Meeting since ${formatDate(study.anchorDate, { month: "long", day: "numeric", year: "numeric" })}`;
}

/** Short "Oct 1" for cards when the first meeting is still ahead; otherwise null. */
export function upcomingStart(study: Study, now: Date) {
  return study.anchorDate > localIsoDate(now, study.timezone)
    ? formatDate(study.anchorDate, { month: "short", day: "numeric" })
    : null;
}

export function timeOfDay(startTime: string): TimeOfDay {
  const { hour } = parseTime(startTime);
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

export function formatClock(startTime: string) {
  const { hour, minute } = parseTime(startTime);
  const suffix = hour < 12 ? "am" : "pm";
  const h12 = hour % 12 || 12;
  return minute === 0 ? `${h12}${suffix}` : `${h12}:${String(minute).padStart(2, "0")}${suffix}`;
}

/** "Tuesdays · 6:30pm" / "Every other Friday · 6:30pm" */
export function cadenceLabel(study: Study) {
  const day = DAY_NAMES[study.dayOfWeek];
  const when = study.cadence === "weekly" ? `${day}s` : `Every other ${day}`;
  return `${when} · ${formatClock(study.startTime)}`;
}

/** Friendly label: "Happening now", "Today at 6:30pm", "Tomorrow at 7pm", "Mon, Oct 12 at 2pm". */
export function relativeLabel(study: Study, next: Date, now: Date) {
  if (next.getTime() <= now.getTime()) return "Happening now";
  const a = wallClock(now, study.timezone);
  const b = wallClock(next, study.timezone);
  const days = Math.round(
    (Date.UTC(b.year, b.month - 1, b.day) - Date.UTC(a.year, a.month - 1, a.day)) / DAY_MS,
  );
  const clock = formatClock(study.startTime);
  if (days === 0) {
    const mins = Math.round((next.getTime() - now.getTime()) / 60_000);
    if (mins < 60) return `Starts in ${mins} min`;
    return `Today at ${clock}`;
  }
  if (days === 1) return `Tomorrow at ${clock}`;
  if (days < 7) return `${DAY_NAMES[b.weekday]} at ${clock}`;
  const date = new Intl.DateTimeFormat("en-US", {
    timeZone: study.timezone,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(next);
  return `${date} at ${clock}`;
}

export function formatMeetingDate(study: Study, date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: study.timezone,
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}
