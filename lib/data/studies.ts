import { getSupabase } from "../supabase/public";
import type { Campus, CampusContact, PrivateMeetingDetails, Study, Tag, TimeOfDay } from "../types";
import { seedCampusContacts, seedCampuses, seedLeaders, seedStudies, seedTags } from "./seed-data";

// Public columns; private address / meeting link live in study_private.
export const STUDY_COLUMNS = `
  id, slug, title, summary, description, curriculum,
  day_of_week, start_time, duration_minutes, timezone, cadence, anchor_date,
  format, neighborhood, location_name, food, capacity,
  campuses ( id, slug, name ),
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

export interface StudyRow {
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
  food: Study["food"];
  capacity: number | null;
  study_leaders: { sort_order: number; leaders: LeaderRow | null }[];
  study_tags: { tags: Tag | null }[];
  campuses: Study["campus"];
}

export function fromRow(row: StudyRow): Study {
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
    food: row.food,
    capacity: row.capacity,
    campus: row.campuses,
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
  const { address, meetingUrl, campusId, leaderIds, tagSlugs, ...rest } = s;
  void address;
  void meetingUrl;
  const { id, slug, name } = seedCampuses.find((c) => c.id === campusId)!;
  return {
    ...rest,
    campus: { id, slug, name },
    leaders: leaderIds.map((id) => seedLeaders.find((l) => l.id === id)!),
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

/** Listed studies, optionally for one campus. */
export async function getStudies(campusId?: string): Promise<Study[]> {
  return withFallback(
    "getStudies",
    async () => {
      let query = getSupabase()!.from("bible_studies").select(STUDY_COLUMNS).eq("status", "active");
      if (campusId) query = query.eq("campus_id", campusId);
      const { data, error } = await query.order("day_of_week").order("start_time");
      if (error) raise(error);
      return (data as unknown as StudyRow[]).map(fromRow);
    },
    () =>
      seedStudies
        .filter((s) => !campusId || s.campusId === campusId)
        .map(seedToPublic)
        .toSorted((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime)),
  );
}

const CAMPUS_COLUMNS = "id, slug, name, city, timezone";

export async function getCampuses(): Promise<Campus[]> {
  return withFallback(
    "getCampuses",
    async () => {
      const { data, error } = await getSupabase()!.from("campuses").select(CAMPUS_COLUMNS).order("name");
      if (error) raise(error);
      return data as Campus[];
    },
    () => seedCampuses,
  );
}

export async function getCampus(slug: string): Promise<Campus | null> {
  return withFallback(
    "getCampus",
    async () => {
      const { data, error } = await getSupabase()!
        .from("campuses")
        .select(CAMPUS_COLUMNS)
        .eq("slug", slug)
        .maybeSingle();
      if (error) raise(error);
      return data as Campus | null;
    },
    () => seedCampuses.find((c) => c.slug === slug) ?? null,
  );
}

/** Campuses with at least one listed study, with counts, for the campus picker. */
export async function getActiveCampuses(): Promise<(Campus & { studyCount: number })[]> {
  const [campuses, counts] = await Promise.all([
    getCampuses(),
    withFallback(
      "getActiveCampuses",
      async () => {
        const { data, error } = await getSupabase()!
          .from("bible_studies")
          .select("campus_id")
          .eq("status", "active");
        if (error) raise(error);
        return data.map((r) => r.campus_id as string);
      },
      () => seedStudies.map((s) => s.campusId),
    ),
  ]);
  return campuses
    .map((c) => ({ ...c, studyCount: counts.filter((id) => id === c.id).length }))
    .filter((c) => c.studyCount > 0);
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

interface ContactRow {
  sort_order: number;
  leaders: {
    id: string;
    name: string;
    photo_url: string | null;
    public_phone: string | null;
    whatsapp: boolean;
  } | null;
}

/** Who "Nothing fits your schedule?" requests go to. Only approved leaders appear. */
export async function getCampusContacts(campusId: string): Promise<CampusContact[]> {
  return withFallback(
    "getCampusContacts",
    async () => {
      const { data, error } = await getSupabase()!
        .from("campus_contacts")
        .select("sort_order, leaders ( id, name, photo_url, public_phone, whatsapp )")
        .eq("campus_id", campusId)
        .order("sort_order");
      if (error) raise(error);
      return (data as unknown as ContactRow[]).flatMap(({ leaders: l }) =>
        l
          ? [
              {
                leaderId: l.id,
                name: l.name,
                photoUrl: l.photo_url,
                publicPhone: l.public_phone,
                whatsapp: l.whatsapp,
              },
            ]
          : [],
      );
    },
    () => seedCampusContacts.filter((c) => c.campusId === campusId),
  );
}

export interface StudyRequestInput {
  campusId: string;
  name: string;
  email: string | null;
  phone: string | null;
  days: number[];
  times: TimeOfDay[];
  message: string | null;
}

/** "Nothing fits my schedule": saved for the campus's contacts to follow up. */
export async function submitStudyRequest(input: StudyRequestInput): Promise<void> {
  return withFallback(
    "submitStudyRequest",
    async () => {
      const { error } = await getSupabase()!.rpc("submit_study_request", {
        p_campus_id: input.campusId,
        p_name: input.name,
        p_email: input.email,
        p_phone: input.phone,
        p_days: input.days,
        p_times: input.times,
        p_message: input.message,
      });
      if (error) raise(error);
    },
    () => console.info("[data] study request (seed mode, not persisted):", input),
  );
}
