import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseEnv } from "./env";

/** Per-request client carrying the signed-in leader's session cookies. */
export async function createSupabaseServer() {
  // Read cookies first: it marks the route as per-request even when the
  // check below fails, so builds without Supabase keys don't try to prerender it.
  const cookieStore = await cookies();
  const env = supabaseEnv();
  if (!env) throw new Error("Supabase is not configured — set NEXT_PUBLIC_SUPABASE_URL/ANON_KEY.");
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
