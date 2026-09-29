"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireLeader } from "@/lib/auth";

const status = z.enum(["new", "contacted", "joined", "declined"]);

export async function updateInquiryStatus(inquiryId: string, formData: FormData) {
  const { supabase } = await requireLeader();
  const parsed = status.safeParse(formData.get("status"));
  if (!parsed.success) return;
  // RLS limits this to inquiries for studies the leader leads.
  const { error } = await supabase.from("inquiries").update({ status: parsed.data }).eq("id", inquiryId);
  if (error) throw new Error(error.message);
  refresh();
}

export async function removeInquiry(inquiryId: string) {
  const { supabase } = await requireLeader();
  // RLS limits this to the leader's own studies. Asking for the deleted row
  // back tells "removed" apart from "not allowed" (which deletes nothing).
  const { data, error } = await supabase.from("inquiries").delete().eq("id", inquiryId).select("id");
  if (error) throw new Error(error.message);
  if (!data.length) throw new Error("That person couldn't be removed.");
  refresh();
}
