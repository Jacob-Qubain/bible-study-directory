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
