export interface Email {
  to: string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}

const DEFAULT_FROM = "Find a Bible Study <onboarding@resend.dev>";

/** Sends through Resend's HTTP API. Returns false (and logs) when not configured. */
export async function sendEmail(email: Email): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.info(`[email] RESEND_API_KEY not set; skipped "${email.subject}" to ${email.to.join(", ")}`);
    return false;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? DEFAULT_FROM,
      to: email.to,
      subject: email.subject,
      html: email.html,
      text: email.text,
      reply_to: email.replyTo,
    }),
  });
  if (!res.ok) {
    console.error(`[email] Resend ${res.status}:`, await res.text());
    return false;
  }
  return true;
}

export function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
