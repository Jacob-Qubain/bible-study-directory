import { getSupabase } from "../supabase";
import type { Leader, PrivateMeetingDetails, Study, Tag } from "../types";
import { seedLeaders, seedStudies, seedTags } from "./seed-data";

// Only public columns — anon has no grant on address / meeting_url / email.
const STUDY_COLUMNS = `
  id, slug, title, summary, description, curriculum,
  day_of_week, start_time, duration_minutes, timezone, cadence, anchor_date,
  format, neighborhood, location_name, childcare, food, capacity,
  study_leaders ( sort_order, leaders ( id, name, photo_url, bio, public_phone, whatsapp ) ),
  study_tags ( tags ( slug, label, category ) )
`;

interface LeaderRow {
  id: string;
  name: string;
  photo_url: string | null;
  bio: string | null;
  public_phone: string | null;
  whatsapp: boolean;
}

interface StudyRow {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string | null;
  curriculum: string | null;
  day_of_week: number;
  start_time: string;
  duration_minutes: number;
  timezone: string;
  cadence: Study["cadence"];
  anchor_date: string;
  format: Study["format"];
  neighborhood: string | null;
  location_name: string | null;
  childcare: boolean;
  food: Study["food"];
  capacity: number | null;
  study_leaders: { sort_order: number; leaders: LeaderRow | null }[];
  study_tags: { tags: Tag | null }[];
}

function fromRow(row: StudyRow): Study {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    description: row.description,
    curriculum: row.curriculum,
    dayOfWeek: row.day_of_week,
    startTime: row.start_time.slice(0, 5),
    durationMinutes: row.duration_minutes,
    timezone: row.timezone,
    cadence: row.cadence,
    anchorDate: row.anchor_date,
    format: row.format,
    neighborhood: row.neighborhood,
    locationName: row.location_name,
    childcare: row.childcare,
    food: row.food,
    capacity: row.capacity,
    leaders: row.study_leaders
      .toSorted((a, b) => a.sort_order - b.sort_order)
      .flatMap(({ leaders: l }) =>
        l
          ? [
              {
                id: l.id,
                name: l.name,
                photoUrl: l.photo_url,
                bio: l.bio,
                publicPhone: l.public_phone,
                whatsapp: l.whatsapp,
              },
            ]
          : [],
      ),
    tags: row.study_tags.flatMap(({ tags }) => (tags ? [tags] : [])),
  };
}

function seedToPublic(s: (typeof seedStudies)[number]): Study {
  const { address, meetingUrl, leaderIds, tagSlugs, ...rest } = s;
  void address;
  void meetingUrl;
  return {
    ...rest,
    leaders: leaderIds.map((id) => {
      const { email, ...leader } = seedLeaders.find((l) => l.id === id)!;
      void email;
      return leader satisfies Leader;
    }),
    tags: tagSlugs.map((slug) => seedTags.find((t) => t.slug === slug)!),
  };
}

class DatabaseUnavailable extends Error {}

/** Throws for a Supabase error; network failures become DatabaseUnavailable. */
function raise(error: { message: string }): never {
  if (/fetch failed|failed to fetch|ENOTFOUND|ECONNREFUSED/i.test(error.message)) {
    throw new DatabaseUnavailable(error.message);
  }
  throw new Error(error.message);
}

// After a network failure, skip Supabase for a minute so dev pages stay fast.
let unavailableUntil = 0;

/**
 * Supabase when configured; otherwise the bundled seed data so the app runs
 * with zero setup. In development an unreachable database also falls back
 * (with a warning) — in production it fails loudly instead.
 */
async function withFallback<T>(label: string, query: () => Promise<T>, seed: () => T): Promise<T> {
  if (!getSupabase() || Date.now() < unavailableUntil) return seed();
  try {
    return await query();
  } catch (err) {
    if (!(err instanceof DatabaseUnavailable) || process.env.NODE_ENV === "production") throw err;
    unavailableUntil = Date.now() + 60_000;
    console.warn(`[data] ${label}: Supabase unreachable, using seed data for 60s —`, err.message);
    return seed();
  }
}

export async function getStudies(): Promise<Study[]> {
  return withFallback(
    "getStudies",
    async () => {
      const { data, error } = await getSupabase()!
        .from("bible_studies")
        .select(STUDY_COLUMNS)
        .eq("status", "active")
        .order("day_of_week")
        .order("start_time");
      if (error) raise(error);
      return (data as unknown as StudyRow[]).map(fromRow);
    },
    () =>
      seedStudies
        .map(seedToPublic)
        .toSorted((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime)),
  );
}

export async function getStudy(slug: string): Promise<Study | null> {
  return withFallback(
    "getStudy",
    async () => {
      const { data, error } = await getSupabase()!
        .from("bible_studies")
        .select(STUDY_COLUMNS)
        .eq("slug", slug)
        .eq("status", "active")
        .maybeSingle();
      if (error) raise(error);
      return data ? fromRow(data as unknown as StudyRow) : null;
    },
    () => {
      const s = seedStudies.find((s) => s.slug === slug);
      return s ? seedToPublic(s) : null;
    },
  );
}

export interface InquiryInput {
  studyId: string;
  name: string;
  email: string | null;
  phone: string | null;
  message: string | null;
}

/** Records a "count me in" and returns the private meeting details. */
export async function submitInquiry(input: InquiryInput): Promise<PrivateMeetingDetails> {
  return withFallback(
    "submitInquiry",
    async () => {
      const { data, error } = await getSupabase()!.rpc("submit_inquiry", {
        p_study_id: input.studyId,
        p_name: input.name,
        p_email: input.email,
        p_phone: input.phone,
        p_message: input.message,
      });
      if (error) raise(error);
      const row = (data as { address: string | null; meeting_url: string | null }[])[0];
      return { address: row?.address ?? null, meetingUrl: row?.meeting_url ?? null };
    },
    () => {
      console.info("[data] inquiry (seed mode, not persisted):", input);
      const s = seedStudies.find((s) => s.id === input.studyId);
      return { address: s?.address ?? null, meetingUrl: s?.meetingUrl ?? null };
    },
  );
}
