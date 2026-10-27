import { formatAvailability } from "./availability";
import { escapeHtml, sendEmail } from "./email";
import { formatPhone } from "./phone";
import { SITE_NAME, SITE_URL } from "./site";
import { getSupabaseAdmin } from "./supabase/admin";
import type { StudyRequestInput } from "./data/studies";

export interface NewInquiry {
  studyId: string;
  name: string;
  email: string | null;
  phone: string | null;
  message: string | null;
}

interface StudyWithLeaders {
  title: string;
  study_leaders: { leaders: { id: string; name: string; auth_user_id: string | null } | null }[];
}

type AdminClient = NonNullable<ReturnType<typeof getSupabaseAdmin>>;

/**
 * Where to reach these leaders: their sign-in email, or, for someone an admin
 * listed who hasn't signed in yet, the email they were invited with.
 */
async function leaderEmails(admin: AdminClient, leaders: { id: string; auth_user_id: string | null }[]) {
  const signedIn = await emailsFor(
    admin,
    leaders.flatMap((l) => (l.auth_user_id ? [l.auth_user_id] : [])),
  );
  const waiting = leaders.filter((l) => !l.auth_user_id).map((l) => l.id);
  const { data: invites } = waiting.length
    ? await admin.from("leader_invites").select("email").in("leader_id", waiting)
    : { data: [] };
  return [...new Set([...signedIn, ...(invites ?? []).map((i) => i.email as string)])];
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
    .select("title, study_leaders ( leaders ( id, name, auth_user_id ) )")
    .eq("id", inquiry.studyId)
    .single<StudyWithLeaders>();
  if (error) {
    console.error("[notify] study lookup failed:", error.message);
    return;
  }

  const emails = await leaderEmails(
    admin,
    data.study_leaders.flatMap(({ leaders: l }) => (l ? [l] : [])),
  );
  if (!emails.length) return; // e.g. sample leaders with no sign-in

  const who = inquiry.name.split(/\s+/)[0];
  const inbox = `${SITE_URL}/leader/people?study=${inquiry.studyId}`;
  const contact = [
    inquiry.email && { label: "Email", value: inquiry.email, href: `mailto:${inquiry.email}` },
    inquiry.phone && { label: "Phone", value: formatPhone(inquiry.phone), href: `sms:${inquiry.phone}` },
  ].filter(Boolean) as { label: string; value: string; href: string }[];

  const e = escapeHtml;
  const html = `
<div style="font-family:system-ui,-apple-system,sans-serif;max-width:480px;color:#1a2633;line-height:1.5">
  <p style="font-size:18px;margin:0 0 12px"><strong>${e(inquiry.name)}</strong> wants to come to <strong>${e(data.title)}</strong>.</p>
  ${contact.map((c) => `<p style="margin:4px 0">${c.label}: <a href="${e(c.href)}">${e(c.value)}</a></p>`).join("")}
  ${inquiry.message ? `<blockquote style="margin:16px 0;padding-left:12px;border-left:3px solid #dbe3ec">${e(inquiry.message)}</blockquote>` : ""}
  <p style="margin:16px 0">A quick hello today goes a long way.${inquiry.email ? " Just reply to this email to write back." : ""}</p>
  <p><a href="${inbox}" style="display:inline-block;background:#236aa6;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none">See everyone who reached out</a></p>
  <p style="color:#566374;font-size:13px">${e(SITE_NAME)}</p>
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

/** Sign-in emails for leader profiles (service role only). */
async function emailsFor(admin: AdminClient, authUserIds: string[]) {
  const users = await Promise.all(authUserIds.map((id) => admin.auth.admin.getUserById(id)));
  return users.map((u) => u.data.user?.email).filter((e): e is string => Boolean(e));
}

interface CampusWithContacts {
  name: string;
  slug: string;
  campus_contacts: { leaders: { auth_user_id: string | null } | null }[];
}

/** Emails a campus's contacts (or the admins, if it has none) when no study fits a student. */
export async function notifyCampusContactsOfRequest(request: StudyRequestInput) {
  const admin = getSupabaseAdmin();
  if (!admin) {
    console.info("[notify] SUPABASE_SERVICE_ROLE_KEY not set; campus contacts not emailed.");
    return;
  }
  const { data, error } = await admin
    .from("campuses")
    .select("name, slug, campus_contacts ( leaders ( auth_user_id ) )")
    .eq("id", request.campusId)
    .single<CampusWithContacts>();
  if (error) {
    console.error("[notify] campus lookup failed:", error.message);
    return;
  }
  let ids = data.campus_contacts.flatMap(({ leaders: l }) => (l?.auth_user_id ? [l.auth_user_id] : []));
  if (!ids.length) {
    // No contacts for this campus yet: the admins pick it up instead.
    const { data: admins } = await admin.from("leaders").select("auth_user_id").eq("is_admin", true);
    ids = (admins ?? []).flatMap((a) => (a.auth_user_id ? [a.auth_user_id as string] : []));
  }
  const emails = await emailsFor(admin, ids);
  if (!emails.length) return;

  const e = escapeHtml;
  const who = request.name.split(/\s+/)[0];
  const free = formatAvailability(request.days, request.times);
  const inbox = `${SITE_URL}/leader/requests?campus=${data.slug}`;
  const contact = [
    request.email && { label: "Email", value: request.email, href: `mailto:${request.email}` },
    request.phone && { label: "Phone", value: formatPhone(request.phone), href: `sms:${request.phone}` },
  ].filter(Boolean) as { label: string; value: string; href: string }[];

  const html = `
<div style="font-family:system-ui,-apple-system,sans-serif;max-width:480px;color:#1a2633;line-height:1.5">
  <p style="font-size:18px;margin:0 0 12px"><strong>${e(request.name)}</strong> is looking for a Bible study at ${e(data.name)}, but none fit their schedule.</p>
  <p style="margin:4px 0"><strong>Free:</strong> ${e(free)}</p>
  ${contact.map((c) => `<p style="margin:4px 0">${c.label}: <a href="${e(c.href)}">${e(c.value)}</a></p>`).join("")}
  ${request.message ? `<blockquote style="margin:16px 0;padding-left:12px;border-left:3px solid #dbe3ec">${e(request.message)}</blockquote>` : ""}
  <p><a href="${inbox}" style="display:inline-block;background:#236aa6;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none">See everyone looking</a></p>
  <p style="color:#566374;font-size:13px">${e(SITE_NAME)}</p>
</div>`;
  const text = [
    `${request.name} is looking for a Bible study at ${data.name}, but none fit their schedule.`,
    `Free: ${free}`,
    ...contact.map((c) => `${c.label}: ${c.value}`),
    request.message ? `\n"${request.message}"` : "",
    `\nSee everyone looking: ${inbox}`,
  ].join("\n");

  await sendEmail({
    to: emails,
    subject: `${who} is looking for a study (${free})`,
    html,
    text,
    replyTo: request.email ?? undefined,
  });
}

interface ListedStudy {
  title: string;
  slug: string;
  campuses: { name: string } | null;
}

/**
 * Tells a leader an admin listed their study. Invited leaders (no account yet)
 * learn that signing in with this email gives them the listing.
 */
export async function notifyLeaderOfListing(opts: { studyId: string; leaderId: string; adminName: string }) {
  const admin = getSupabaseAdmin();
  if (!admin) {
    console.info("[notify] SUPABASE_SERVICE_ROLE_KEY not set; leader not told about listing.");
    return;
  }
  const [{ data: study, error }, { data: leader }] = await Promise.all([
    admin.from("bible_studies").select("title, slug, campuses ( name )").eq("id", opts.studyId).single<ListedStudy>(),
    admin.from("leaders").select("id, name, auth_user_id").eq("id", opts.leaderId).single(),
  ]);
  if (error || !leader) {
    console.error("[notify] listing lookup failed:", error?.message);
    return;
  }
  const emails = await leaderEmails(admin, [leader]);
  if (!emails.length) return;

  const e = escapeHtml;
  const first = String(leader.name).split(/\s+/)[0];
  const page = `${SITE_URL}/studies/${study.slug}`;
  const login = `${SITE_URL}/leader/login`;
  const campus = study.campuses?.name ?? "your campus";
  const html = `
<div style="font-family:system-ui,-apple-system,sans-serif;max-width:480px;color:#1a2633;line-height:1.5">
  <p style="font-size:18px;margin:0 0 12px">Hi ${e(first)}! ${e(opts.adminName)} listed <strong>${e(study.title)}</strong> on ${e(SITE_NAME)}, so students at ${e(campus)} can find it.</p>
  <p style="margin:4px 0">When someone wants to come, you'll get an email with their name and how to reach them. Reply and say hi.</p>
  <p style="margin:16px 0">To change the details, pause it, or see everyone who's interested, sign in with this email address. There's no password; we email you a link.</p>
  <p><a href="${page}" style="display:inline-block;background:#236aa6;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none">See your study</a>
     &nbsp; <a href="${login}" style="color:#236aa6">Sign in</a></p>
  <p style="color:#566374;font-size:13px">${e(SITE_NAME)}</p>
</div>`;
  const text = [
    `Hi ${first}! ${opts.adminName} listed ${study.title} on ${SITE_NAME}, so students at ${campus} can find it.`,
    "When someone wants to come, you'll get an email with their name and how to reach them.",
    "To change the details, pause it, or see everyone who's interested, sign in with this email address (no password; we email you a link).",
    `\nSee your study: ${page}`,
    `Sign in: ${login}`,
  ].join("\n");

  await sendEmail({ to: emails, subject: `${study.title} is now on ${SITE_NAME}`, html, text });
}
