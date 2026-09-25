import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseEnv } from "./env";

let client: SupabaseClient | null | undefined;

/**
 * Anonymous, cookie-less client for the public directory. Deliberately not
 * the signed-in client, so leaders see exactly what visitors see.
 * Null when Supabase isn't configured.
 */
export function getSupabase(): SupabaseClient | null {
  if (client !== undefined) return client;
  const env = supabaseEnv();
  client = env ? createClient(env.url, env.key, { auth: { persistSession: false } }) : null;
  return client;
}
