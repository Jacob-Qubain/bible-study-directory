import { escapeHtml, sendEmail } from "./email";
import { formatPhone } from "./phone";
import { SITE_NAME, SITE_URL } from "./site";
import { getSupabaseAdmin } from "./supabase/admin";

export interface NewInquiry {
  studyId: string;
  name: string;
  email: string | null;
  phone: string | null;
  message: string | null;
}

interface StudyWithLeaders {
  title: string;
  study_leaders: { leaders: { name: string; auth_user_id: string | null } | null }[];
}

/**
 * Emails every leader of the study that someone wants to come. Replying to
 * the email goes straight to the visitor when they left an email address.
 * Best-effort: failures are logged, never shown to the visitor.
 */
export async function notifyLeadersOfInquiry(inquiry: NewInquiry) {
  const admin = getSupabaseAdmin();
  if (!admin) {
    console.info("[notify] SUPABASE_SERVICE_ROLE_KEY not set; leader not emailed.");
    return;
  }

  const { data, error } = await admin
    .from("bible_studies")
    .select("title, study_leaders ( leaders ( name, auth_user_id ) )")
    .eq("id", inquiry.studyId)
    .single<StudyWithLeaders>();
  if (error) {
    console.error("[notify] study lookup failed:", error.message);
    return;
  }

  const leaders = data.study_leaders.flatMap(({ leaders: l }) => (l?.auth_user_id ? [l] : []));
  const emails = (
    await Promise.all(
      leaders.map(async (l) => (await admin.auth.admin.getUserById(l.auth_user_id!)).data.user?.email),
    )
  ).filter((e): e is string => Boolean(e));
  if (!emails.length) return; // e.g. sample leaders with no sign-in

  const who = inquiry.name.split(/\s+/)[0];
  const inbox = `${SITE_URL}/leader/people?study=${inquiry.studyId}`;
  const contact = [
    inquiry.email && { label: "Email", value: inquiry.email, href: `mailto:${inquiry.email}` },
    inquiry.phone && { label: "Phone", value: formatPhone(inquiry.phone), href: `sms:${inquiry.phone}` },
  ].filter(Boolean) as { label: string; value: string; href: string }[];

  const e = escapeHtml;
  const html = `
<div style="font-family:system-ui,-apple-system,sans-serif;max-width:480px;color:#1f2a24;line-height:1.5">
  <p style="font-size:18px;margin:0 0 12px"><strong>${e(inquiry.name)}</strong> wants to come to <strong>${e(data.title)}</strong>.</p>
  ${contact.map((c) => `<p style="margin:4px 0">${c.label}: <a href="${e(c.href)}">${e(c.value)}</a></p>`).join("")}
  ${inquiry.message ? `<blockquote style="margin:16px 0;padding-left:12px;border-left:3px solid #e6ddcf">${e(inquiry.message)}</blockquote>` : ""}
  <p style="margin:16px 0">A quick hello today goes a long way.${inquiry.email ? " Just reply to this email to write back." : ""}</p>
  <p><a href="${inbox}" style="display:inline-block;background:#2f5d50;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none">See everyone who reached out</a></p>
  <p style="color:#5d6a62;font-size:13px">${e(SITE_NAME)}</p>
</div>`;
  const text = [
    `${inquiry.name} wants to come to ${data.title}.`,
    ...contact.map((c) => `${c.label}: ${c.value}`),
    inquiry.message ? `\n"${inquiry.message}"` : "",
    `\nSee everyone who reached out: ${inbox}`,
  ].join("\n");

  await sendEmail({
    to: emails,
    subject: `${who} wants to join ${data.title}`,
    html,
    text,
    replyTo: inquiry.email ?? undefined,
  });
}
