import { cache } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "./supabase/server";
import type { Leader } from "./types";

export interface LeaderAccount extends Leader {
  approved: boolean;
  isAdmin: boolean;
  /** Campuses where this leader receives "nothing fits my schedule" requests. */
  contactCampusIds: string[];
}

/** The signed-in user and their leader profile (if they've created one). Cached per request. */
export const getSession = cache(async () => {
  const supabase = await createSupabaseServer();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) return { supabase, user: null, leader: null };

  const findLeader = () =>
    supabase
      .from("leaders")
      .select("id, name, photo_url, bio, public_phone, whatsapp, approved, is_admin")
      .eq("auth_user_id", claims.sub)
      .maybeSingle();
  let { data: row, error } = await findLeader();
  if (error) throw new Error(error.message);
  if (!row) {
    // An admin may have listed a study for this email before they ever signed
    // in; if so, that profile (and its studies) becomes theirs now.
    const { data: claimed } = await supabase.rpc("claim_leader_invite");
    if (claimed) ({ data: row, error } = await findLeader());
    if (error) throw new Error(error.message);
  }

  const { data: contactRows } = row
    ? await supabase.from("campus_contacts").select("campus_id").eq("leader_id", row.id)
    : { data: [] };

  const leader: LeaderAccount | null = row && {
    id: row.id,
    name: row.name,
    photoUrl: row.photo_url,
    bio: row.bio,
    publicPhone: row.public_phone,
    whatsapp: row.whatsapp,
    approved: row.approved,
    isAdmin: row.is_admin,
    contactCampusIds: (contactRows ?? []).map((c) => c.campus_id as string),
  };
  return { supabase, user: { id: claims.sub, email: String(claims.email ?? "") }, leader };
});

export async function requireUser() {
  const session = await getSession();
  if (!session.user) redirect("/leader/login");
  return { ...session, user: session.user };
}

/** Signed in *and* has a leader profile; otherwise sends them to the right step. */
export async function requireLeader() {
  const session = await requireUser();
  if (!session.leader) redirect("/leader/welcome");
  return { ...session, leader: session.leader };
}

export async function requireAdmin() {
  const session = await requireLeader();
  if (!session.leader.isAdmin) redirect("/leader");
  return session;
}
