"use server";

import { refresh } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { notifyLeaderOfListing } from "@/lib/notify";
import { NEW_LEADER } from "./new-leader";

export type AddLeaderState =
  | { status: "idle" }
  | { status: "added"; name: string }
  | { status: "error"; message: string; values: { leaderId: string; name: string; email: string } };

/** Adds another leader to a study: an existing leader, or someone new by name + email. */
export async function addStudyLeader(
  studyId: string,
  _prev: AddLeaderState,
  formData: FormData,
): Promise<AddLeaderState> {
  const { supabase, leader: me } = await requireAdmin();
  const values = {
    leaderId: String(formData.get("leaderId") ?? ""),
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
  };
  const fail = (message: string): AddLeaderState => ({ status: "error", message, values });

  let leaderId: string;
  if (values.leaderId === NEW_LEADER) {
    const name = values.name.trim();
    const email = z.email().safeParse(values.email.trim());
    if (!name) return fail("Add their name.");
    if (!email.success) return fail("Add their email so they get notified and can sign in.");
    const { data, error } = await supabase.rpc("admin_invite_leader", { p_name: name, p_email: email.data });
    if (error) return fail("We couldn't add them. Please try again.");
    leaderId = data as string;
  } else if (z.uuid().safeParse(values.leaderId).success) {
    leaderId = values.leaderId;
  } else {
    return fail("Choose a leader to add.");
  }

  const [{ data: person }, { data: current, error: listError }] = await Promise.all([
    supabase.from("leaders").select("name").eq("id", leaderId).maybeSingle(),
    supabase.from("study_leaders").select("leader_id, sort_order").eq("study_id", studyId),
  ]);
  if (!person || listError) return fail("We couldn't add them. Please try again.");
  if (current.some((c) => c.leader_id === leaderId)) return fail(`${person.name} already leads this study.`);

  // After the existing leaders, so the original leader stays listed first.
  const sortOrder = Math.max(-1, ...current.map((c) => c.sort_order as number)) + 1;
  const { error } = await supabase
    .from("study_leaders")
    .insert({ study_id: studyId, leader_id: leaderId, role: "co_leader", sort_order: sortOrder });
  if (error) return fail("We couldn't add them. Please try again.");

  if (leaderId !== me.id) {
    const added = { studyId, leaderId, adminName: me.name, added: true };
    after(() => notifyLeaderOfListing(added));
  }
  refresh();
  return { status: "added", name: person.name };
}

/** Removes a leader from a study. A study always keeps at least one. */
export async function removeStudyLeader(studyId: string, leaderId: string) {
  const { supabase } = await requireAdmin();
  const { data: current, error: listError } = await supabase
    .from("study_leaders")
    .select("leader_id")
    .eq("study_id", studyId);
  if (listError) throw new Error(listError.message);
  if (current.length <= 1 || !current.some((c) => c.leader_id === leaderId)) return;
  const { error } = await supabase
    .from("study_leaders")
    .delete()
    .eq("study_id", studyId)
    .eq("leader_id", leaderId);
  if (error) throw new Error(error.message);
  refresh();
}
