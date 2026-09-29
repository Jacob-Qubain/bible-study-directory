import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Mail, MessageSquareText, Phone } from "lucide-react";
import { buttonClass } from "@/components/ui/field";
import { requireLeader } from "@/lib/auth";
import { formatAvailability, SHORT_DAYS, TIMES_OF_DAY, WEEK } from "@/lib/availability";
import { getCampuses, getStudies } from "@/lib/data/studies";
import { getStudyRequests, isFreeAt, stillLooking } from "@/lib/leader/requests";
import { formatPhone } from "@/lib/phone";
import { requestTime } from "@/lib/request-time";
import { timeOfDay } from "@/lib/schedule";
import { timeAgo } from "@/lib/time-ago";
import { CopyNumbers } from "../people/copy-numbers";
import { RemovePersonButton } from "../people/remove-button";
import { StatusSelect } from "../people/status-select";
import { removeRequest, updateRequestStatus } from "./actions";
import { DemandGrid } from "./demand-grid";

export const metadata: Metadata = { title: "Looking for a study" };

export default async function RequestsPage(props: PageProps<"/leader/requests">) {
  const { supabase, leader } = await requireLeader();
  const params = await props.searchParams;

  const campuses = (await getCampuses()).filter(
    (c) => leader.isAdmin || leader.contactCampusIds.includes(c.id),
  );
  if (!campuses.length) redirect("/leader");
  const campus = campuses.find((c) => c.slug === params.campus) ?? campuses[0];

  const [requests, studies] = await Promise.all([
    getStudyRequests(supabase, campus.id),
    getStudies(campus.id),
  ]);
  const looking = requests.filter(stillLooking);

  // Demand grid: who's free when, next to what already meets then.
  const grid = TIMES_OF_DAY.map((time) =>
    WEEK.map((day) => ({
      day,
      time,
      free: looking.filter((r) => isFreeAt(r, day, time)).length,
      studies: studies.filter((s) => s.dayOfWeek === day && timeOfDay(s.startTime) === time).length,
    })),
  );
  const busiest = Math.max(0, ...grid.flat().map((c) => c.free));

  const slotDay = Number(params.day);
  const slotTime = TIMES_OF_DAY.find((t) => t === params.time);
  const slot = slotTime && Number.isInteger(slotDay) && slotDay >= 0 && slotDay <= 6 ? { day: slotDay, time: slotTime } : null;
  const shown = slot ? requests.filter((r) => stillLooking(r) && isFreeAt(r, slot.day, slot.time)) : requests;
  const phones = [...new Set(shown.filter((r) => r.status !== "declined").flatMap((r) => (r.phone ? [r.phone] : [])))];
  const base = `/leader/requests?campus=${campus.slug}`;
  const now = requestTime();

  return (
    <div className="grid gap-6">
      <header className="grid gap-1">
        <h1 className="font-display text-3xl font-semibold">Looking for a study</h1>
        <p className="text-muted">
          Students at {campus.name} who couldn&apos;t find a study that fits their schedule.
        </p>
      </header>

      {campuses.length > 1 && (
        <nav aria-label="Campus" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          {campuses.map((c) => (
            <Link
              key={c.id}
              href={`/leader/requests?campus=${c.slug}`}
              aria-current={c.id === campus.id ? "page" : undefined}
              className={`${buttonClass.secondary} shrink-0 ${c.id === campus.id ? "border-accent bg-accent text-accent-ink hover:bg-accent" : ""}`}
            >
              {c.name}
            </Link>
          ))}
        </nav>
      )}

      <section aria-labelledby="grid-heading" className="grid gap-3 rounded-2xl border border-line bg-surface p-4 sm:p-5">
        <div className="grid gap-1">
          <h2 id="grid-heading" className="font-display text-xl font-semibold">
            When people are free
          </h2>
          <p className="text-sm text-muted">
            {looking.length} still looking. Tap a time to see who&apos;s free then; a dot means a study already meets.
          </p>
        </div>
        <DemandGrid grid={grid} busiest={busiest} slot={slot} base={base} />
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-semibold">
          {slot ? `Free ${SHORT_DAYS[slot.day]} ${slot.time}s (${shown.length})` : `Everyone (${shown.length})`}
        </h2>
        <div className="flex flex-wrap gap-2">
          {slot && (
            <Link href={base} className={buttonClass.quiet}>
              Show everyone
            </Link>
          )}
          {phones.length > 0 && <CopyNumbers phones={phones} />}
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line px-6 py-14 text-center text-muted">
          {slot
            ? "No one who's still looking is free then."
            : "No one yet. When a student taps “Nothing fits your schedule?”, they'll show up here."}
        </p>
      ) : (
        <ul className="grid gap-3">
          {shown.map((r) => {
            const greeting = `Hi ${r.name.split(" ")[0]}! This is ${leader.name.split(" ")[0]} from ${campus.name}. You mentioned you're looking for a Bible study. I'd love to help you find one!`;
            return (
              <li
                key={r.id}
                className={`grid gap-3 rounded-2xl border bg-surface p-5 ${r.status === "new" ? "border-warm/40" : "border-line"}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="grid gap-0.5">
                    <p className="font-semibold">
                      {r.name}
                      {r.status === "new" && (
                        <span className="ml-2 rounded-full bg-warm-soft px-2 py-0.5 text-xs font-semibold text-warm">
                          New
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-muted">
                      Free: {formatAvailability(r.days, r.times)} · {timeAgo(r.createdAt, now)}
                    </p>
                  </div>
                  <StatusSelect id={r.id} name={r.name} status={r.status} action={updateRequestStatus} />
                </div>

                {r.message && <blockquote className="border-l-2 border-line pl-3 text-sm">{r.message}</blockquote>}

                <div className="flex flex-wrap gap-2">
                  {r.email && (
                    <a
                      href={`mailto:${r.email}?subject=${encodeURIComponent("Finding a Bible study")}&body=${encodeURIComponent(greeting)}`}
                      className={buttonClass.secondary}
                    >
                      <Mail className="size-4 text-accent" aria-hidden />
                      {r.email}
                    </a>
                  )}
                  {r.phone && (
                    <>
                      <a href={`sms:${r.phone}?&body=${encodeURIComponent(greeting)}`} className={buttonClass.secondary}>
                        <MessageSquareText className="size-4 text-accent" aria-hidden />
                        Text {formatPhone(r.phone)}
                      </a>
                      <a href={`tel:${r.phone}`} className={buttonClass.secondary}>
                        <Phone className="size-4 text-accent" aria-hidden />
                        Call
                      </a>
                    </>
                  )}
                  <RemovePersonButton id={r.id} name={r.name} action={removeRequest} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
