"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireLeader } from "@/lib/auth";

const status = z.enum(["new", "contacted", "joined", "declined"]);

// RLS limits both of these to campuses where the leader is a contact (or admin).

export async function updateRequestStatus(requestId: string, formData: FormData) {
  const { supabase } = await requireLeader();
  const parsed = status.safeParse(formData.get("status"));
  if (!parsed.success) return;
  const { error } = await supabase.from("study_requests").update({ status: parsed.data }).eq("id", requestId);
  if (error) throw new Error(error.message);
  refresh();
}

export async function removeRequest(requestId: string) {
  const { supabase } = await requireLeader();
  const { data, error } = await supabase.from("study_requests").delete().eq("id", requestId).select("id");
  if (error) throw new Error(error.message);
  if (!data.length) throw new Error("That request couldn't be removed.");
  refresh();
}
