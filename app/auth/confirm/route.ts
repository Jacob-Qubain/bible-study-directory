import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { safeNext } from "@/lib/safe-next";
import { createSupabaseServer } from "@/lib/supabase/server";

/**
 * Landing point for magic links. Supports both link styles:
 * - `?token_hash=…&type=email` (custom email template; works across devices)
 * - `?code=…` (Supabase's default PKCE link; same browser only)
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const next = safeNext(params.get("next"));
  const tokenHash = params.get("token_hash");
  const type = params.get("type") as EmailOtpType | null;
  const code = params.get("code");

  const supabase = await createSupabaseServer();
  const { error } = tokenHash && type
    ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    : code
      ? await supabase.auth.exchangeCodeForSession(code)
      : { error: new Error("Missing token") };

  if (error) {
    console.error("[auth] confirm failed:", error.message);
    return NextResponse.redirect(new URL("/leader/login?error=link", request.url));
  }
  return NextResponse.redirect(new URL(next, request.url));
}
