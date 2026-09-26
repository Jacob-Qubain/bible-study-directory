"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { safeNext } from "@/lib/safe-next";
import { SITE_URL } from "@/lib/site";
import { createSupabaseServer } from "@/lib/supabase/server";

export type LoginState =
  | { status: "idle" }
  | { status: "sent"; email: string }
  | { status: "error"; message: string; email: string };

export async function sendMagicLink(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!z.email().safeParse(email).success) {
    return { status: "error", message: "That doesn't look like an email address.", email };
  }

  // Production always uses the canonical site URL, which must be on Supabase's
  // redirect allow-list; otherwise Supabase silently falls back to the home page.
  // Dev uses the request origin so localhost links stay local.
  const origin =
    process.env.NODE_ENV === "production" ? SITE_URL : ((await headers()).get("origin") ?? SITE_URL);
  const next = safeNext(formData.get("next"));
  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/confirm?next=${encodeURIComponent(next)}` },
  });

  if (error) {
    console.error("[auth] signInWithOtp failed:", error.status, error.message);
    return {
      status: "error",
      email,
      message:
        error.status === 429
          ? "We just sent you a link. Please wait a minute before asking for another."
          : "We couldn't send the email. Please try again in a moment.",
    };
  }
  return { status: "sent", email };
}

export async function signOut() {
  const supabase = await createSupabaseServer();
  await supabase.auth.signOut();
  redirect("/leader/login");
}
