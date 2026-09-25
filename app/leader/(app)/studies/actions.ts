"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
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

  const row = toStudyRow(parsed.data);
  let id = studyId;

  if (id) {
    if (!(await getEditableStudy(supabase, id, leader.id))) redirect("/leader");
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

  redirect(`/leader?saved=${id}`);
}

export async function setStudyStatus(studyId: string, status: "active" | "paused") {
  const { supabase, leader } = await requireLeader();
  if (!(await getEditableStudy(supabase, studyId, leader.id))) return;
  const { error } = await supabase.from("bible_studies").update({ status }).eq("id", studyId);
  if (error) throw new Error(error.message);
  refresh();
}

export async function deleteStudy(studyId: string) {
  const { supabase, leader } = await requireLeader();
  if (!(await getEditableStudy(supabase, studyId, leader.id))) redirect("/leader");
  const { error } = await supabase.from("bible_studies").delete().eq("id", studyId);
  if (error) throw new Error(error.message);
  redirect("/leader");
}
