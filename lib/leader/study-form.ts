import { z } from "zod";
import { nextMeeting, wallClock } from "../schedule";
import { DEFAULT_TIMEZONE } from "../site";
import type { FoodProvided, Study, StudyCadence, StudyFormat } from "../types";

/** Everything the study editor submits, as strings/booleans straight from the form. */
export interface StudyFormValues {
  title: string;
  summary: string;
  description: string;
  curriculum: string;
  date: string; // "YYYY-MM-DD", the next meeting — also sets the weekday and biweekly parity
  time: string; // "HH:MM"
  duration: string;
  cadence: StudyCadence;
  timezone: string;
  format: StudyFormat;
  locationName: string;
  neighborhood: string;
  address: string;
  meetingUrl: string;
  childcare: boolean;
  food: FoodProvided;
  capacity: string;
  tags: string[];
}

export type StudyFieldErrors = Partial<Record<keyof StudyFormValues, string>>;

export const EMPTY_STUDY: StudyFormValues = {
  title: "",
  summary: "",
  description: "",
  curriculum: "",
  date: "",
  time: "19:00",
  duration: "90",
  cadence: "weekly",
  timezone: DEFAULT_TIMEZONE,
  format: "in_person",
  locationName: "",
  neighborhood: "",
  address: "",
  meetingUrl: "",
  childcare: false,
  food: "none",
  capacity: "",
  tags: [],
};

export function readStudyForm(formData: FormData): StudyFormValues {
  const s = (k: string) => String(formData.get(k) ?? "");
  return {
    title: s("title"),
    summary: s("summary"),
    description: s("description"),
    curriculum: s("curriculum"),
    date: s("date"),
    time: s("time"),
    duration: s("duration"),
    cadence: s("cadence") as StudyCadence,
    timezone: s("timezone"),
    format: s("format") as StudyFormat,
    locationName: s("locationName"),
    neighborhood: s("neighborhood"),
    address: s("address"),
    meetingUrl: s("meetingUrl"),
    childcare: formData.get("childcare") === "on",
    food: s("food") as FoodProvided,
    capacity: s("capacity"),
    tags: formData.getAll("tags").map(String),
  };
}

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep it under ${max} characters.`)
    .transform((v) => v || null);

const schema = z
  .object({
    title: z.string().trim().min(1, "Give your study a name.").max(120),
    summary: z.string().trim().min(1, "One line helps people choose.").max(200, "Keep it to one line."),
    description: optional(4000),
    curriculum: optional(200),
    date: z.iso.date("Pick the date of your next meeting."),
    time: z.string().regex(/^\d{2}:\d{2}$/, "Pick a start time."),
    duration: z.coerce.number().int().min(5).max(720),
    cadence: z.enum(["weekly", "biweekly"]),
    timezone: z.string().refine((tz) => {
      try {
        new Intl.DateTimeFormat("en-US", { timeZone: tz });
        return true;
      } catch {
        return false;
      }
    }, "Pick a timezone."),
    format: z.enum(["in_person", "online", "hybrid"]),
    locationName: optional(120),
    neighborhood: optional(80),
    address: optional(300),
    meetingUrl: z
      .string()
      .trim()
      .transform((v) => v || null)
      .pipe(z.url({ protocol: /^https?$/, error: "Paste the full link, starting with https://" }).nullable()),
    childcare: z.boolean(),
    food: z.enum(["none", "snacks", "meal"]),
    capacity: z
      .string()
      .trim()
      .transform((v) => (v ? Number(v) : null))
      .pipe(z.number().int("Use a whole number.").min(1).max(500).nullable()),
    tags: z.array(z.string()),
  })
  .superRefine((v, ctx) => {
    if (v.format !== "online" && !v.locationName) {
      ctx.addIssue({
        code: "custom",
        path: ["locationName"],
        message: "Add where you meet, like “Newman Center, Room 214”.",
      });
    }
    if (v.format !== "in_person" && !v.meetingUrl) {
      ctx.addIssue({
        code: "custom",
        path: ["meetingUrl"],
        message: "Add the video link. Only people who join will see it.",
      });
    }
  });

export type ParsedStudy = z.output<typeof schema>;

export function parseStudyForm(values: StudyFormValues):
  | { ok: true; data: ParsedStudy }
  | { ok: false; fields: StudyFieldErrors } {
  const result = schema.safeParse(values);
  if (result.success) return { ok: true, data: result.data };
  const fields: StudyFieldErrors = {};
  for (const issue of result.error.issues) {
    fields[issue.path[0] as keyof StudyFormValues] ??= issue.message;
  }
  return { ok: false, fields };
}

/** Columns for bible_studies (public) — private details are saved separately. */
export function toStudyRow(d: ParsedStudy) {
  return {
    title: d.title,
    summary: d.summary,
    description: d.description,
    curriculum: d.curriculum,
    day_of_week: new Date(`${d.date}T00:00:00Z`).getUTCDay(),
    start_time: d.time,
    duration_minutes: d.duration,
    timezone: d.timezone,
    cadence: d.cadence,
    anchor_date: d.date,
    format: d.format,
    location_name: d.locationName,
    neighborhood: d.neighborhood,
    childcare: d.childcare,
    food: d.food,
    capacity: d.capacity,
  };
}

export function slugify(title: string) {
  return (
    title
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "study"
  );
}

/** Prefills the editor; the date field shows the next upcoming meeting. */
export function studyToFormValues(
  study: Study,
  priv: { address: string | null; meetingUrl: string | null },
  now: Date,
): StudyFormValues {
  const next = wallClock(nextMeeting(study, now), study.timezone);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    title: study.title,
    summary: study.summary,
    description: study.description ?? "",
    curriculum: study.curriculum ?? "",
    date: `${next.year}-${pad(next.month)}-${pad(next.day)}`,
    time: study.startTime,
    duration: String(study.durationMinutes),
    cadence: study.cadence,
    timezone: study.timezone,
    format: study.format,
    locationName: study.locationName ?? "",
    neighborhood: study.neighborhood ?? "",
    address: priv.address ?? "",
    meetingUrl: priv.meetingUrl ?? "",
    childcare: study.childcare,
    food: study.food,
    capacity: study.capacity ? String(study.capacity) : "",
    tags: study.tags.map((t) => t.slug),
  };
}
