import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseEnv } from "./env";

/** Per-request client carrying the signed-in leader's session cookies. */
export async function createSupabaseServer() {
  const env = supabaseEnv();
  if (!env) throw new Error("Supabase is not configured — set NEXT_PUBLIC_SUPABASE_URL/ANON_KEY.");
  const cookieStore = await cookies();
  return createServerClient(env.url, env.key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components can't set cookies; proxy.ts refreshes the session instead.
        }
      },
    },
  });
}
