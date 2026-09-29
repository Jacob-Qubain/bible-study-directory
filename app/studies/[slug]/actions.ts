"use server";

import { after } from "next/server";
import { submitInquiry } from "@/lib/data/studies";
import { notifyLeadersOfInquiry } from "@/lib/notify";
import { parseContact } from "@/lib/contact";
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
    const inquiry = { studyId, name, message, ...contact! };
    const details = await submitInquiry(inquiry);
    // Email the leader once the visitor already has their confirmation.
    after(() => notifyLeadersOfInquiry(inquiry));
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
