import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  CalendarPlus,
  Clock,
  MapPin,
  MessageCircle,
  MessageSquareText,
  Users,
} from "lucide-react";
import { Avatar, leaderNames } from "@/components/ui/avatar";
import { NextMeeting } from "@/components/next-meeting";
import { FormatBadge, Perks, locationLabel } from "@/components/study-badges";
import { googleCalendarUrl } from "@/lib/calendar";
import { getStudy } from "@/lib/data/studies";
import { requestTime } from "@/lib/request-time";
import { cadenceLabel, nextMeeting } from "@/lib/schedule";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import type { Leader, Study } from "@/lib/types";
import { JoinForm } from "./join-form";

export async function generateMetadata(props: PageProps<"/studies/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const study = await getStudy(slug);
  return study ? { title: study.title, description: study.summary } : {};
}

function durationLabel(minutes: number) {
  if (minutes < 60) return `${minutes} minutes`;
  const h = minutes / 60;
  return Number.isInteger(h) ? `${h} hour${h > 1 ? "s" : ""}` : `${h.toFixed(1)} hours`;
}

function greeting(study: Study) {
  return `Hi! I found "${study.title}" on ${SITE_NAME} and I'd love to come.`;
}

function ContactButtons({ leader, study }: { leader: Leader; study: Study }) {
  if (!leader.publicPhone) return null;
  const text = encodeURIComponent(greeting(study));
  const btn =
    "inline-flex min-h-10 items-center gap-2 rounded-full border border-line bg-surface px-4 text-sm font-semibold hover:border-accent/50 hover:bg-accent-soft";
  return (
    <div className="flex flex-wrap gap-2">
      <a href={`sms:${leader.publicPhone}?&body=${text}`} className={btn}>
        <MessageSquareText className="size-4 text-accent" aria-hidden />
        Text {leader.name.split(" ")[0]}
      </a>
      {leader.whatsapp && (
        <a
          href={`https://wa.me/${leader.publicPhone.replace(/\D/g, "")}?text=${text}`}
          target="_blank"
          rel="noreferrer"
          className={btn}
        >
          <MessageCircle className="size-4 text-accent" aria-hidden />
          WhatsApp
        </a>
      )}
    </div>
  );
}

export default async function StudyPage(props: PageProps<"/studies/[slug]">) {
  const { slug } = await props.params;
  const study = await getStudy(slug);
  if (!study) notFound();

  const serverNow = requestTime();
  const next = nextMeeting(study, new Date(serverNow));
  const hostNames = leaderNames(study.leaders);

  const expectations = [
    { icon: Clock, label: `About ${durationLabel(study.durationMinutes)}` },
    { icon: CalendarDays, label: cadenceLabel(study) },
    study.curriculum && { icon: BookOpen, label: `Reading: ${study.curriculum}` },
    study.capacity && { icon: Users, label: `Room for about ${study.capacity}` },
  ].filter(Boolean) as { icon: typeof Clock; label: string }[];

  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 pb-16">
      <Link
        href="/"
        className="inline-flex min-h-10 items-center gap-1.5 text-sm font-medium text-muted hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden />
        All studies
      </Link>

      {/* Mobile order: header → join card → details. Desktop: sticky join card on the right. */}
      <div className="mt-4 grid gap-8 lg:grid-cols-[1fr_380px] lg:grid-rows-[auto_1fr] lg:gap-x-10">
        <header className="grid content-start gap-4 lg:col-start-1">
          <div className="flex flex-wrap items-center gap-2">
            <FormatBadge format={study.format} />
            {study.tags.map((t) => (
              <span
                key={t.slug}
                className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent"
              >
                {t.label}
              </span>
            ))}
          </div>
          <h1 className="font-display text-4xl leading-tight font-semibold tracking-tight text-balance sm:text-5xl">
            {study.title}
          </h1>
          <p className="text-lg text-muted">{study.summary}</p>
          <p className="flex items-center gap-2 text-sm">
            <MapPin className="size-4 text-muted" aria-hidden />
            {locationLabel(study)}
          </p>
        </header>

        <aside className="lg:sticky lg:top-6 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start">
          <div className="grid gap-6 rounded-2xl border border-line bg-surface p-6 shadow-sm">
            <NextMeeting study={study} serverNow={serverNow} />

            <div className="flex flex-wrap gap-2">
              <a
                href={googleCalendarUrl(study, next, SITE_URL)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line px-4 text-sm font-semibold hover:bg-accent-soft"
              >
                <CalendarPlus className="size-4 text-accent" aria-hidden />
                Google Calendar
              </a>
              <a
                href={`/studies/${study.slug}/calendar.ics`}
                className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line px-4 text-sm font-semibold hover:bg-accent-soft"
              >
                <CalendarPlus className="size-4 text-accent" aria-hidden />
                Apple / Outlook
              </a>
            </div>

            <hr className="border-line" />

            <div className="grid gap-1">
              <h2 className="font-display text-xl font-semibold">Want to come?</h2>
              <p className="text-sm text-muted">
                Let {hostNames} know you&apos;re coming. Takes ten seconds.
              </p>
            </div>
            <JoinForm
              studyId={study.id}
              hostNames={hostNames}
              placeName={study.format === "online" ? null : locationLabel(study)}
            />
          </div>
        </aside>

        <div className="grid content-start gap-8 lg:col-start-1">
          <section className="grid gap-4" aria-labelledby="expect-heading">
            <h2 id="expect-heading" className="font-display text-2xl font-semibold">
              What to expect
            </h2>
            {study.description && <p className="leading-relaxed">{study.description}</p>}
            <ul className="grid gap-2 sm:grid-cols-2">
              {expectations.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-2 text-sm">
                  <Icon className="size-4 shrink-0 text-accent" aria-hidden />
                  {label}
                </li>
              ))}
            </ul>
            <Perks study={study} />
          </section>

          <section className="grid gap-4" aria-labelledby="leaders-heading">
            <h2 id="leaders-heading" className="font-display text-2xl font-semibold">
              Meet {study.leaders.length > 1 ? "your hosts" : "your host"}
            </h2>
            {study.leaders.map((leader) => (
              <div
                key={leader.id}
                className="flex gap-4 rounded-2xl border border-line bg-surface p-5"
              >
                <Avatar leader={leader} size="lg" />
                <div className="grid content-start gap-2">
                  <p className="font-semibold">{leader.name}</p>
                  {leader.bio && <p className="text-muted">{leader.bio}</p>}
                  <ContactButtons leader={leader} study={study} />
                </div>
              </div>
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}
