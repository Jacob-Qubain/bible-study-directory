import type { Metadata } from "next";
import Link from "next/link";
import { Contact, FileSpreadsheet, Mail, MessageSquareText, Phone } from "lucide-react";
import { buttonClass } from "@/components/ui/field";
import { requireLeader } from "@/lib/auth";
import { getInquiries, getMyStudies } from "@/lib/leader/queries";
import { formatPhone } from "@/lib/phone";
import { requestTime } from "@/lib/request-time";
import { StatusSelect } from "./status-select";

export const metadata: Metadata = { title: "People" };

function timeAgo(iso: string, now: number) {
  const minutes = Math.round((now - Date.parse(iso)) / 60_000);
  const rtf = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });
  if (minutes < 60) return rtf.format(-Math.max(minutes, 1), "minute");
  if (minutes < 60 * 24) return rtf.format(-Math.round(minutes / 60), "hour");
  if (minutes < 60 * 24 * 7) return rtf.format(-Math.round(minutes / 1440), "day");
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(iso));
}

export default async function PeoplePage(props: PageProps<"/leader/people">) {
  const { supabase, leader } = await requireLeader();
  const { study: studyParam } = await props.searchParams;
  const studies = await getMyStudies(supabase, leader.id);
  const selected = studies.find((s) => s.id === studyParam);
  const inquiries = await getInquiries(
    supabase,
    selected ? [selected.id] : studies.map((s) => s.id),
  );
  const titles = new Map(studies.map((s) => [s.id, s.title]));
  const now = requestTime();
  const exportable = inquiries.filter((q) => q.status !== "declined").length;
  const studyQuery = selected ? `&study=${selected.id}` : "";

  const tab = (active: boolean) =>
    `${buttonClass.secondary} ${active ? "border-accent bg-accent text-accent-ink hover:bg-accent" : ""}`;

  return (
    <div className="grid gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-1">
          <h1 className="font-display text-3xl font-semibold">People who want to come</h1>
          <p className="text-muted">
            A quick hello goes a long way. Most people decide in the first day.
          </p>
        </div>
        {exportable > 0 && (
          <div className="flex flex-wrap gap-2">
            {/* Plain links: these download files, so skip client-side navigation. */}
            <a href={`/leader/people/export?format=vcf${studyQuery}`} className={buttonClass.secondary} download>
              <Contact className="size-4 text-accent" aria-hidden />
              Save to phone contacts
            </a>
            <a href={`/leader/people/export?format=csv${studyQuery}`} className={buttonClass.secondary} download>
              <FileSpreadsheet className="size-4 text-accent" aria-hidden />
              Spreadsheet
            </a>
          </div>
        )}
      </header>

      {studies.length > 1 && (
        <nav aria-label="Filter by study" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          <Link href="/leader/people" className={tab(!selected)} aria-current={!selected ? "page" : undefined}>
            All studies
          </Link>
          {studies.map((s) => (
            <Link
              key={s.id}
              href={`/leader/people?study=${s.id}`}
              className={`${tab(selected?.id === s.id)} shrink-0`}
              aria-current={selected?.id === s.id ? "page" : undefined}
            >
              {s.title}
            </Link>
          ))}
        </nav>
      )}

      {inquiries.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line px-6 py-14 text-center text-muted">
          No one yet. When someone taps “Count me in,” they&apos;ll show up here.
        </p>
      ) : (
        <ul className="grid gap-3">
          {inquiries.map((q) => {
            const greeting = `Hi ${q.name.split(" ")[0]}! This is ${leader.name.split(" ")[0]} from ${titles.get(q.studyId)}. So glad you want to come!`;
            return (
              <li
                key={q.id}
                className={`grid gap-3 rounded-2xl border bg-surface p-5 ${q.status === "new" ? "border-warm/40" : "border-line"}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="grid gap-0.5">
                    <p className="font-semibold">
                      {q.name}
                      {q.status === "new" && (
                        <span className="ml-2 rounded-full bg-warm-soft px-2 py-0.5 text-xs font-semibold text-warm">
                          New
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-muted">
                      {!selected && <>{titles.get(q.studyId)} · </>}
                      {timeAgo(q.createdAt, now)}
                    </p>
                  </div>
                  <StatusSelect inquiry={q} />
                </div>

                {q.message && (
                  <blockquote className="border-l-2 border-line pl-3 text-sm">{q.message}</blockquote>
                )}

                <div className="flex flex-wrap gap-2">
                  {q.email && (
                    <a
                      href={`mailto:${q.email}?subject=${encodeURIComponent(titles.get(q.studyId) ?? "Bible study")}&body=${encodeURIComponent(greeting)}`}
                      className={buttonClass.secondary}
                    >
                      <Mail className="size-4 text-accent" aria-hidden />
                      {q.email}
                    </a>
                  )}
                  {q.phone && (
                    <>
                      <a href={`sms:${q.phone}?&body=${encodeURIComponent(greeting)}`} className={buttonClass.secondary}>
                        <MessageSquareText className="size-4 text-accent" aria-hidden />
                        Text {formatPhone(q.phone)}
                      </a>
                      <a href={`tel:${q.phone}`} className={buttonClass.secondary}>
                        <Phone className="size-4 text-accent" aria-hidden />
                        Call
                      </a>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
