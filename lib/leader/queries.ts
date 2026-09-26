import type { SupabaseClient } from "@supabase/supabase-js";
import { fromRow, STUDY_COLUMNS, type StudyRow } from "../data/studies";
import type { Study, Tag } from "../types";
import type { InquiryStatus } from "./inquiry-status";

export type StudyStatus = "active" | "paused" | "archived";

export interface LeaderStudy extends Study {
  status: StudyStatus;
  address: string | null;
  meetingUrl: string | null;
}

type Row = StudyRow & {
  status: StudyStatus;
  // One-to-one embed; PostgREST returns an object, but tolerate an array.
  study_private: { address: string | null; meeting_url: string | null } | { address: string | null; meeting_url: string | null }[] | null;
};

const COLUMNS = `${STUDY_COLUMNS}, status, study_private ( address, meeting_url )`;

function fromLeaderRow(row: Row): LeaderStudy {
  const priv = Array.isArray(row.study_private) ? row.study_private[0] : row.study_private;
  return {
    ...fromRow(row),
    status: row.status,
    address: priv?.address ?? null,
    meetingUrl: priv?.meeting_url ?? null,
  };
}

/** Studies this leader leads (admins included — they only see their own here). */
export async function getMyStudies(supabase: SupabaseClient, leaderId: string) {
  const { data: links, error: linkError } = await supabase
    .from("study_leaders")
    .select("study_id")
    .eq("leader_id", leaderId);
  if (linkError) throw new Error(linkError.message);
  const ids = links.map((l) => l.study_id as string);
  if (!ids.length) return [];

  const { data, error } = await supabase
    .from("bible_studies")
    .select(COLUMNS)
    .in("id", ids)
    .neq("status", "archived")
    .order("day_of_week")
    .order("start_time");
  if (error) throw new Error(error.message);
  return (data as unknown as Row[]).map(fromLeaderRow);
}

/** A study the signed-in leader may edit, or null (RLS hides everyone else's). */
export async function getEditableStudy(supabase: SupabaseClient, id: string, leaderId: string) {
  const { data: link } = await supabase
    .from("study_leaders")
    .select("study_id")
    .eq("study_id", id)
    .eq("leader_id", leaderId)
    .maybeSingle();
  if (!link) return null;

  const { data, error } = await supabase.from("bible_studies").select(COLUMNS).eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? fromLeaderRow(data as unknown as Row) : null;
}

export async function getAllTags(supabase: SupabaseClient): Promise<Tag[]> {
  const { data, error } = await supabase.from("tags").select("slug, label, category").order("label");
  if (error) throw new Error(error.message);
  return data as Tag[];
}

export interface Inquiry {
  id: string;
  studyId: string;
  name: string;
  email: string | null;
  phone: string | null;
  message: string | null;
  status: InquiryStatus;
  createdAt: string;
}

export async function getInquiries(supabase: SupabaseClient, studyIds: string[]): Promise<Inquiry[]> {
  if (!studyIds.length) return [];
  const { data, error } = await supabase
    .from("inquiries")
    .select("id, study_id, name, email, phone, message, status, created_at")
    .in("study_id", studyIds)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);
  return data.map((r) => ({
    id: r.id,
    studyId: r.study_id,
    name: r.name,
    email: r.email,
    phone: r.phone,
    message: r.message,
    status: r.status,
    createdAt: r.created_at,
  }));
}
