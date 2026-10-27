"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { requireLeader } from "@/lib/auth";
import {
  parseStudyForm,
  readStudyForm,
  slugify,
  toStudyRow,
  type StudyFieldErrors,
  type StudyFormValues,
} from "@/lib/leader/study-form";
import { getEditableStudy } from "@/lib/leader/queries";
import { notifyLeaderOfListing } from "@/lib/notify";

export type StudyFormState =
  | { status: "idle" }
  | { status: "error"; message: string; fields: StudyFieldErrors; values: StudyFormValues };

const UNIQUE_VIOLATION = "23505";

/** Creates a study (studyId null) or updates one the leader leads. */
export async function saveStudy(
  studyId: string | null,
  _prev: StudyFormState,
  formData: FormData,
): Promise<StudyFormState> {
  const { supabase, leader } = await requireLeader();
  const values = readStudyForm(formData);
  const parsed = parseStudyForm(values);
  if (!parsed.ok) {
    return { status: "error", message: "A few things need a look.", fields: parsed.fields, values };
  }
  const fail = (err: { message: string }) => {
    console.error("[leader] saveStudy failed:", err.message);
    return {
      status: "error" as const,
      message: "We couldn't save your study. Please try again.",
      fields: {},
      values,
    };
  };

  const { data: campus } = await supabase
    .from("campuses")
    .select("timezone")
    .eq("id", parsed.data.campusId)
    .maybeSingle();
  if (!campus) {
    return {
      status: "error",
      message: "A few things need a look.",
      fields: { campusId: "Pick your campus." },
      values,
    };
  }
  const row = toStudyRow(parsed.data, campus.timezone);
  let id = studyId;

  // Admins can list a new study for someone else: an existing leader, or a
  // new person by name + email (who claims it when they first sign in).
  let leadBy: string | null = null;
  if (!studyId && leader.isAdmin && values.leaderMode !== "me") {
    const fields: StudyFieldErrors = {};
    if (values.leaderMode === "existing") {
      const { data: chosen } = z.uuid().safeParse(values.leaderId).success
        ? await supabase.from("leaders").select("id").eq("id", values.leaderId).maybeSingle()
        : { data: null };
      if (chosen) leadBy = chosen.id;
      else fields.leaderId = "Choose who leads it.";
    } else {
      const name = values.newLeaderName.trim();
      const email = z.email().safeParse(values.newLeaderEmail.trim());
      if (!name) fields.newLeaderName = "Add their name.";
      if (!email.success) fields.newLeaderEmail = "Add their email so they can sign in and manage it.";
      if (name && email.success) {
        const { data: invited, error } = await supabase.rpc("admin_invite_leader", {
          p_name: name,
          p_email: email.data,
        });
        if (error) return fail(error);
        leadBy = invited as string;
      }
    }
    if (Object.keys(fields).length) {
      return { status: "error", message: "A few things need a look.", fields, values };
    }
  }

  if (id) {
    if (!(await getEditableStudy(supabase, id, leader))) redirect("/leader");
    const { error } = await supabase.from("bible_studies").update(row).eq("id", id);
    if (error) return fail(error);
  } else {
    // Insert without RETURNING: the creator only becomes a leader of the row
    // via the after-insert trigger, so we pick the id ourselves.
    id = crypto.randomUUID();
    const base = slugify(parsed.data.title);
    for (let attempt = 0; ; attempt++) {
      const slug = attempt === 0 ? base : `${base}-${crypto.randomUUID().slice(0, 4)}`;
      const { error } = await supabase.from("bible_studies").insert({ ...row, id, slug });
      if (!error) break;
      if (error.code !== UNIQUE_VIOLATION || attempt >= 3) return fail(error);
    }
  }

  const { error: privError } = await supabase
    .from("study_private")
    .update({ address: parsed.data.address, meeting_url: parsed.data.meetingUrl })
    .eq("study_id", id);
  if (privError) return fail(privError);

  const { error: clearError } = await supabase.from("study_tags").delete().eq("study_id", id);
  if (clearError) return fail(clearError);
  if (parsed.data.tags.length) {
    const { data: tagRows, error: tagError } = await supabase
      .from("tags")
      .select("id")
      .in("slug", parsed.data.tags);
    if (tagError) return fail(tagError);
    const { error } = await supabase
      .from("study_tags")
      .insert(tagRows.map((t) => ({ study_id: id, tag_id: t.id })));
    if (error) return fail(error);
  }

  if (leadBy && leadBy !== leader.id) {
    // The insert trigger made the admin its leader; hand it to the real one.
    const { error: assignError } = await supabase
      .from("study_leaders")
      .insert({ study_id: id, leader_id: leadBy, role: "leader" });
    if (assignError) return fail(assignError);
    await supabase.from("study_leaders").delete().eq("study_id", id).eq("leader_id", leader.id);
    const listed = { studyId: id, leaderId: leadBy, adminName: leader.name };
    after(() => notifyLeaderOfListing(listed));
    redirect(`/leader/admin?listed=${id}`);
  }

  redirect(`/leader?saved=${id}`);
}

export async function setStudyStatus(studyId: string, status: "active" | "paused") {
  const { supabase, leader } = await requireLeader();
  if (!(await getEditableStudy(supabase, studyId, leader))) return;
  const { error } = await supabase.from("bible_studies").update({ status }).eq("id", studyId);
  if (error) throw new Error(error.message);
  refresh();
}

export async function deleteStudy(studyId: string) {
  const { supabase, leader } = await requireLeader();
  if (!(await getEditableStudy(supabase, studyId, leader))) redirect("/leader");
  const { error } = await supabase.from("bible_studies").delete().eq("id", studyId);
  if (error) throw new Error(error.message);
  redirect("/leader");
}
