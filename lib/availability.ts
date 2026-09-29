import type { TimeOfDay } from "./types";

/** Monday-first, matching the directory's day filter. */
export const WEEK = [1, 2, 3, 4, 5, 6, 0];
export const SHORT_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const TIMES_OF_DAY: TimeOfDay[] = ["morning", "afternoon", "evening"];

/** "Tue, Thu · evenings" · "Any day · mornings, evenings" · "Flexible" */
export function formatAvailability(days: number[], times: string[]) {
  const dayText = days.length
    ? WEEK.filter((d) => days.includes(d)).map((d) => SHORT_DAYS[d]).join(", ")
    : null;
  const timeText = times.length
    ? TIMES_OF_DAY.filter((t) => times.includes(t)).map((t) => `${t}s`).join(", ")
    : null;
  if (!dayText && !timeText) return "Flexible";
  return [dayText ?? "Any day", timeText ?? "any time"].join(" · ");
}
