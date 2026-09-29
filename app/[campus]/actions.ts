"use server";

import { after } from "next/server";
import { TIMES_OF_DAY } from "@/lib/availability";
import { parseContact } from "@/lib/contact";
import { submitStudyRequest } from "@/lib/data/studies";
import { notifyCampusContactsOfRequest } from "@/lib/notify";
import type { TimeOfDay } from "@/lib/types";

export type RequestState =
  | { status: "idle" }
  | { status: "sent"; firstName: string }
  | {
      status: "error";
      message: string;
      fields?: { name?: string; contact?: string };
      values: { name: string; contact: string; message: string; days: number[]; times: TimeOfDay[] };
    };

export async function requestStudy(
  campusId: string,
  _prev: RequestState,
  formData: FormData,
): Promise<RequestState> {
  // Honeypot: real people never see or fill this field.
  if (formData.get("website")) return { status: "idle" };

  const days = [...new Set(formData.getAll("days").map(Number))].filter(
    (d) => Number.isInteger(d) && d >= 0 && d <= 6,
  );
  const times = [...new Set(formData.getAll("times").map(String))].filter((t): t is TimeOfDay =>
    TIMES_OF_DAY.includes(t as TimeOfDay),
  );
  const values = {
    name: String(formData.get("name") ?? ""),
    contact: String(formData.get("contact") ?? ""),
    message: String(formData.get("message") ?? ""),
    days,
    times,
  };
  const name = values.name.trim().slice(0, 120);
  const contact = parseContact(values.contact);

  const fields: { name?: string; contact?: string } = {};
  if (!name) fields.name = "What should we call you?";
  if (!contact) fields.contact = "Add an email or phone number so we can reach you.";
  if (fields.name || fields.contact) {
    return { status: "error", message: "Almost there — just one more thing.", fields, values };
  }

  const request = {
    campusId,
    name,
    days,
    times,
    message: values.message.trim().slice(0, 1000) || null,
    ...contact!,
  };
  try {
    await submitStudyRequest(request);
  } catch (err) {
    const tooMany = (err as Error).message.includes("Too many");
    return {
      status: "error",
      values,
      message: tooMany
        ? "We already have your request. Someone will be in touch soon."
        : "Something went wrong on our end. Please try again.",
    };
  }
  after(() => notifyCampusContactsOfRequest(request));
  return { status: "sent", firstName: name.split(/\s+/)[0] };
}
