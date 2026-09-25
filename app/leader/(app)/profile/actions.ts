"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { normalizePhone } from "@/lib/phone";

export type ProfileValues = { name: string; bio: string; phone: string; whatsapp: boolean };

export type ProfileState =
  | { status: "idle" }
  | { status: "saved" }
  | { status: "error"; message: string; fields: Partial<Record<keyof ProfileValues, string>>; values: ProfileValues };

const schema = z.object({
  name: z.string().trim().min(1, "Add the name people will see.").max(120),
  bio: z.string().trim().max(2000, "Keep it under 2,000 characters."),
  phone: z.string(),
  whatsapp: z.boolean(),
});

export async function saveProfile(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const { supabase, user, leader } = await requireUser();

  const values: ProfileValues = {
    name: String(formData.get("name") ?? ""),
    bio: String(formData.get("bio") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    whatsapp: formData.get("whatsapp") === "on",
  };
  const parsed = schema.safeParse(values);
  const fields: Partial<Record<keyof ProfileValues, string>> = {};
  if (!parsed.success) {
    for (const issue of parsed.error.issues) fields[issue.path[0] as keyof ProfileValues] ??= issue.message;
  }
  const phone = normalizePhone(values.phone);
  if (values.phone.trim() && !phone) fields.phone = "Use a full number, like (512) 555-0101.";
  if (Object.keys(fields).length || !parsed.success) {
    return { status: "error", message: "Please fix the highlighted fields.", fields, values };
  }

  const row = {
    name: parsed.data.name,
    bio: parsed.data.bio || null,
    public_phone: phone,
    whatsapp: Boolean(phone) && parsed.data.whatsapp,
  };

  const { error } = leader
    ? await supabase.from("leaders").update(row).eq("id", leader.id)
    : await supabase.from("leaders").insert({ ...row, auth_user_id: user.id });

  if (error) {
    console.error("[leader] saveProfile failed:", error.message);
    return { status: "error", message: "We couldn't save that. Please try again.", fields: {}, values };
  }

  // First-time setup continues to the dashboard; edits stay on the page.
  if (!leader) redirect("/leader");
  refresh();
  return { status: "saved" };
}
