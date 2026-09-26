import { z } from "zod";
export { slugify } from "../slugify";
import type { FoodProvided, Study, StudyCadence, StudyFormat } from "../types";

/** Everything the study editor submits, as strings/booleans straight from the form. */
export interface StudyFormValues {
  title: string;
  summary: string;
  description: string;
  curriculum: string;
  campusId: string;
  date: string; // "YYYY-MM-DD", the first meeting — also sets the weekday and biweekly parity
  time: string; // "HH:MM"
  duration: string;
  cadence: StudyCadence;
  format: StudyFormat;
  locationName: string;
  neighborhood: string;
  address: string;
  meetingUrl: string;
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
  campusId: "",
  date: "",
  time: "19:00",
  duration: "90",
  cadence: "weekly",
  format: "in_person",
  locationName: "",
  neighborhood: "",
  address: "",
  meetingUrl: "",
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
    campusId: s("campusId"),
    date: s("date"),
    time: s("time"),
    duration: s("duration"),
    cadence: s("cadence") as StudyCadence,
    format: s("format") as StudyFormat,
    locationName: s("locationName"),
    neighborhood: s("neighborhood"),
    address: s("address"),
    meetingUrl: s("meetingUrl"),
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
    campusId: z.uuid("Pick your campus."),
    date: z.iso.date("Pick the date of your first meeting."),
    time: z.string().regex(/^\d{2}:\d{2}$/, "Pick a start time."),
    duration: z.coerce.number().int().min(5).max(720),
    cadence: z.enum(["weekly", "biweekly"]),
    format: z.enum(["in_person", "online", "hybrid"]),
    locationName: optional(120),
    neighborhood: optional(80),
    address: optional(300),
    meetingUrl: z
      .string()
      .trim()
      .transform((v) => v || null)
      .pipe(z.url({ protocol: /^https?$/, error: "Paste the full link, starting with https://" }).nullable()),
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

/**
 * Columns for bible_studies (public); private details are saved separately.
 * The timezone comes from the campus, so leaders never pick one.
 */
export function toStudyRow(d: ParsedStudy, campusTimezone: string) {
  return {
    campus_id: d.campusId,
    title: d.title,
    summary: d.summary,
    description: d.description,
    curriculum: d.curriculum,
    day_of_week: new Date(`${d.date}T00:00:00Z`).getUTCDay(),
    start_time: d.time,
    duration_minutes: d.duration,
    timezone: campusTimezone,
    cadence: d.cadence,
    anchor_date: d.date,
    format: d.format,
    location_name: d.locationName,
    neighborhood: d.neighborhood,
    food: d.food,
    capacity: d.capacity,
  };
}


export function studyToFormValues(
  study: Study,
  priv: { address: string | null; meetingUrl: string | null },
): StudyFormValues {
  return {
    title: study.title,
    summary: study.summary,
    description: study.description ?? "",
    curriculum: study.curriculum ?? "",
    campusId: study.campus.id,
    date: study.anchorDate,
    time: study.startTime,
    duration: String(study.durationMinutes),
    cadence: study.cadence,
    format: study.format,
    locationName: study.locationName ?? "",
    neighborhood: study.neighborhood ?? "",
    address: priv.address ?? "",
    meetingUrl: priv.meetingUrl ?? "",
    food: study.food,
    capacity: study.capacity ? String(study.capacity) : "",
    tags: study.tags.map((t) => t.slug),
  };
}
