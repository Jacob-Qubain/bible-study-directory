"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { slugify } from "@/lib/slugify";
import { US_TIMEZONES } from "@/lib/timezones";

export type CampusFormState =
  | { status: "idle" }
  | { status: "added"; name: string; slug: string }
  | {
      status: "error";
      message: string;
      values: { name: string; city: string; slug: string; timezone: string };
    };

const RESERVED = ["leader", "studies", "auth", "api", "admin", "login", "about", "campus", "campuses"];

const schema = z.object({
  name: z.string().trim().min(2, "Add the campus name.").max(120),
  city: z.string().trim().max(120),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and dashes.")
    .refine((s) => !RESERVED.includes(s), "That address is reserved; try another."),
  timezone: z.enum(US_TIMEZONES.map(([tz]) => tz) as [string, ...string[]]),
});

export async function addCampus(_prev: CampusFormState, formData: FormData): Promise<CampusFormState> {
  const { supabase } = await requireAdmin();
  const values = {
    name: String(formData.get("name") ?? ""),
    city: String(formData.get("city") ?? ""),
    slug: String(formData.get("slug") ?? "").trim(),
    timezone: String(formData.get("timezone") ?? ""),
  };
  const parsed = schema.safeParse({ ...values, slug: values.slug || slugify(values.name) });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0].message, values };
  }

  const { name, city, slug, timezone } = parsed.data;
  const { error } = await supabase.from("campuses").insert({ name, city: city || null, slug, timezone });
  if (error) {
    return {
      status: "error",
      values,
      message:
        error.code === "23505"
          ? "A campus with that name or address already exists."
          : "We couldn't add that campus. Please try again.",
    };
  }
  refresh();
  return { status: "added", name, slug };
}

/** Only empty campuses can be removed; the database also refuses otherwise. */
export async function removeCampus(campusId: string) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("campuses").delete().eq("id", campusId);
  if (error) throw new Error(error.message);
  refresh();
}
