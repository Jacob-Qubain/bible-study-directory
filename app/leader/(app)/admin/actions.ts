"use server";

import { refresh } from "next/cache";
import { requireAdmin } from "@/lib/auth";

export async function setApproval(leaderId: string, approved: boolean) {
  const { supabase } = await requireAdmin();
  // set_leader_approval() re-checks is_admin() in the database.
  const { error } = await supabase.rpc("set_leader_approval", {
    p_leader_id: leaderId,
    p_approved: approved,
  });
  if (error) throw new Error(error.message);
  refresh();
}
