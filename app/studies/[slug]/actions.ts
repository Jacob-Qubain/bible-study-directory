"use server";

import { submitInquiry } from "@/lib/data/studies";
import { normalizePhone } from "@/lib/phone";
import type { PrivateMeetingDetails } from "@/lib/types";

export type JoinState =
  | { status: "idle" }
  | {
      status: "error";
      message: string;
      fields?: { name?: string; contact?: string };
      // Echoed back so React's post-action form reset doesn't wipe what they typed.
      values: { name: string; contact: string; message: string };
    }
  | { status: "success"; firstName: string; details: PrivateMeetingDetails };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** One contact field accepts either an email or a phone number. */
function parseContact(raw: string): { email: string | null; phone: string | null } | null {
  const value = raw.trim();
  if (value.includes("@")) return EMAIL.test(value) ? { email: value, phone: null } : null;
  const phone = normalizePhone(value);
  return phone ? { email: null, phone } : null;
}

export async function joinStudy(
  studyId: string,
  _prev: JoinState,
  formData: FormData,
): Promise<JoinState> {
  // Honeypot: real people never see or fill this field.
  if (formData.get("website")) return { status: "idle" };

  const values = {
    name: String(formData.get("name") ?? ""),
    contact: String(formData.get("contact") ?? ""),
    message: String(formData.get("message") ?? ""),
  };
  const name = values.name.trim().slice(0, 120);
  const contact = parseContact(values.contact);
  const message = values.message.trim().slice(0, 1000) || null;

  const fields: { name?: string; contact?: string } = {};
  if (!name) fields.name = "What should we call you?";
  if (!contact) fields.contact = "Add an email or phone number so the leader can say hi.";
  if (fields.name || fields.contact) {
    return { status: "error", message: "Almost there — just one more thing.", fields, values };
  }

  try {
    const details = await submitInquiry({ studyId, name, message, ...contact! });
    return { status: "success", firstName: name.split(/\s+/)[0], details };
  } catch (err) {
    const tooMany = (err as Error).message.includes("Too many");
    return {
      status: "error",
      message: tooMany
        ? "Looks like you've already reached out — the leader will be in touch soon."
        : "Something went wrong on our end. Please try again, or text the leader directly.",
      values,
    };
  }
}
