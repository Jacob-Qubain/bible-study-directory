import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseEnv } from "./env";

let client: SupabaseClient | null | undefined;

/**
 * Service-role client that bypasses RLS. Server-only: the key has no
 * NEXT_PUBLIC_ prefix, so it's never bundled for the browser. Use it only for
 * work visitors must not do themselves, like looking up a leader's email.
 * Null when SUPABASE_SERVICE_ROLE_KEY isn't set.
 */
export function getSupabaseAdmin(): SupabaseClient | null {
  if (client !== undefined) return client;
  const env = supabaseEnv();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  client =
    env && key
      ? createClient(env.url, key, { auth: { persistSession: false, autoRefreshToken: false } })
      : null;
  return client;
}
