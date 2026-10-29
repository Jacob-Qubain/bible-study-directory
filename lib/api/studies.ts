import { cadenceLabel, DAY_NAMES, nextMeeting } from "../schedule";
import { SITE_URL } from "../site";
import type { Study } from "../types";

/**
 * The public API's shape for a study. Built field by field (never by spreading
 * a Study), so nothing private can leak by accident: no address, meeting
 * link, leader phone numbers, or emails. Joining happens on our site via `url`.
 */
export function toApiStudy(study: Study, now: Date) {
  return {
    id: study.id,
    slug: study.slug,
    title: study.title,
    summary: study.summary,
    description: study.description,
    reading: study.curriculum,
    url: `${SITE_URL}/studies/${study.slug}`,
    campus: { slug: study.campus.slug, name: study.campus.name },
    schedule: {
      label: cadenceLabel(study), // "Tuesdays · 6:30pm"
      day: DAY_NAMES[study.dayOfWeek],
      dayOfWeek: study.dayOfWeek, // 0 = Sunday
      startTime: study.startTime, // "18:30", local to `timezone`
      durationMinutes: study.durationMinutes,
      cadence: study.cadence, // "weekly" | "biweekly"
      timezone: study.timezone,
      firstMeeting: study.anchorDate,
      nextMeeting: nextMeeting(study, now).toISOString(),
    },
    format: study.format, // "in_person" | "online" | "hybrid"
    location: { name: study.locationName, area: study.neighborhood },
    food: study.food, // "none" | "snacks" | "meal"
    capacity: study.capacity,
    leaders: study.leaders.map((l) => ({ name: l.name, photoUrl: l.photoUrl })),
    audience: study.tags.filter((t) => t.category === "audience").map((t) => t.label),
    focus: study.tags.filter((t) => t.category === "topic").map((t) => t.label),
  };
}

export type ApiStudy = ReturnType<typeof toApiStudy>;
