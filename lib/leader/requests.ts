import type { SupabaseClient } from "@supabase/supabase-js";
import type { TimeOfDay } from "../types";
import type { InquiryStatus } from "./inquiry-status";

export interface StudyRequest {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  days: number[];
  times: TimeOfDay[];
  message: string | null;
  status: InquiryStatus;
  createdAt: string;
}

/** RLS limits this to campuses where the signed-in leader is a contact (or admin). */
export async function getStudyRequests(supabase: SupabaseClient, campusId: string): Promise<StudyRequest[]> {
  const { data, error } = await supabase
    .from("study_requests")
    .select("id, name, email, phone, days, times, message, status, created_at")
    .eq("campus_id", campusId)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);
  return data.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    phone: r.phone,
    days: r.days,
    times: r.times,
    message: r.message,
    status: r.status,
    createdAt: r.created_at,
  }));
}

/** Empty days/times mean "flexible", so they're free in every slot. */
export function isFreeAt(r: Pick<StudyRequest, "days" | "times">, day: number, time: TimeOfDay) {
  return (!r.days.length || r.days.includes(day)) && (!r.times.length || r.times.includes(time));
}

/** Still looking = not yet placed in a study or ruled out. */
export function stillLooking(r: Pick<StudyRequest, "status">) {
  return r.status === "new" || r.status === "contacted";
}
