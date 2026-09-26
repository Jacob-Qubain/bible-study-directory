import { wallClock } from "./schedule";
import type { Study } from "./types";

const BYDAY = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

const pad = (n: number) => String(n).padStart(2, "0");

/** "20260929T183000" in the study's local time. */
function localStamp(date: Date, timeZone: string) {
  const w = wallClock(date, timeZone);
  return `${w.year}${pad(w.month)}${pad(w.day)}T${pad(w.hour)}${pad(w.minute)}00`;
}

function rrule(study: Study) {
  const interval = study.cadence === "biweekly" ? ";INTERVAL=2" : "";
  return `RRULE:FREQ=WEEKLY${interval};BYDAY=${BYDAY[study.dayOfWeek]}`;
}

function publicLocation(study: Study) {
  return [study.locationName, study.neighborhood].filter(Boolean).join(", ");
}

export function googleCalendarUrl(study: Study, start: Date, siteUrl: string) {
  const end = new Date(start.getTime() + study.durationMinutes * 60_000);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: study.title,
    dates: `${localStamp(start, study.timezone)}/${localStamp(end, study.timezone)}`,
    ctz: study.timezone,
    recur: rrule(study),
    details: `${study.summary}\n\n${siteUrl}/studies/${study.slug}`,
    location: publicLocation(study),
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

function escapeIcs(text: string) {
  return text.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/[,;]/g, (m) => `\\${m}`);
}

export function icsFor(study: Study, start: Date, siteUrl: string) {
  const end = new Date(start.getTime() + study.durationMinutes * 60_000);
  const tz = study.timezone;
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Find a Bible Study//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${study.id}@findabiblestudy.org`,
    `DTSTAMP:${stamp}`,
    `DTSTART;TZID=${tz}:${localStamp(start, tz)}`,
    `DTEND;TZID=${tz}:${localStamp(end, tz)}`,
    rrule(study),
    `SUMMARY:${escapeIcs(study.title)}`,
    `DESCRIPTION:${escapeIcs(study.summary)}`,
    `LOCATION:${escapeIcs(publicLocation(study))}`,
    `URL:${siteUrl}/studies/${study.slug}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
