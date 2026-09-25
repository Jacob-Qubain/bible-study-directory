import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, ExternalLink, MapPin, Pause, Pencil, Play, Plus, Users } from "lucide-react";
import { locationLabel } from "@/components/study-badges";
import { buttonClass, Notice } from "@/components/ui/field";
import { requireLeader } from "@/lib/auth";
import { getInquiries, getMyStudies, type LeaderStudy } from "@/lib/leader/queries";
import { cadenceLabel } from "@/lib/schedule";
import { setStudyStatus } from "./studies/actions";

export const metadata: Metadata = { title: "My studies" };

function StatusPill({ study, approved }: { study: LeaderStudy; approved: boolean }) {
  const [label, cls] =
    study.status === "paused"
      ? ["Paused", "bg-surface-2 text-muted"]
      : approved
        ? ["Live", "bg-accent-soft text-accent"]
        : ["Awaiting approval", "bg-warm-soft text-warm"];
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${cls}`}>{label}</span>;
}

export default async function DashboardPage(props: PageProps<"/leader">) {
  const { supabase, leader } = await requireLeader();
  const { saved } = await props.searchParams;
  const studies = await getMyStudies(supabase, leader.id);
  const inquiries = await getInquiries(
    supabase,
    studies.map((s) => s.id),
  );
  const newCount = (studyId: string) =>
    inquiries.filter((i) => i.studyId === studyId && i.status === "new").length;
  const savedStudy = studies.find((s) => s.id === saved);

  return (
    <div className="grid gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-1">
          <h1 className="font-display text-3xl font-semibold">
            Hi, {leader.name.split(" ")[0]}
          </h1>
          <p className="text-muted">Your studies, and the people who want to join them.</p>
        </div>
        <Link href="/leader/studies/new" className={buttonClass.primary}>
          <Plus className="size-5" aria-hidden />
          New study
        </Link>
      </header>

      {!leader.approved && (
        <Notice tone="warn">
          <strong>Thanks for signing up!</strong> An admin will approve your profile shortly. Until
          then your studies are saved but hidden from the directory.
        </Notice>
      )}
      {savedStudy && (
        <Notice>
          Saved “{savedStudy.title}”.{" "}
          {leader.approved && savedStudy.status === "active" && (
            <Link href={`/studies/${savedStudy.slug}`} className="font-semibold text-accent underline">
              See it live
            </Link>
          )}
        </Notice>
      )}

      {studies.length === 0 ? (
        <div className="grid justify-items-center gap-3 rounded-2xl border border-dashed border-line px-6 py-14 text-center">
          <p className="font-display text-xl font-semibold">You haven&apos;t listed a study yet.</p>
          <p className="max-w-sm text-muted">It takes about two minutes. You can pause or edit it any time.</p>
          <Link href="/leader/studies/new" className={`${buttonClass.primary} mt-2`}>
            List your first study
          </Link>
        </div>
      ) : (
        <ul className="grid gap-4">
          {studies.map((study) => {
            const fresh = newCount(study.id);
            const paused = study.status === "paused";
            return (
              <li
                key={study.id}
                className={`grid gap-4 rounded-2xl border border-line bg-surface p-5 ${paused ? "opacity-75" : ""}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="grid gap-1">
                    <h2 className="font-display text-xl font-semibold">{study.title}</h2>
                    <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays className="size-4" aria-hidden />
                        {cadenceLabel(study)}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="size-4" aria-hidden />
                        {locationLabel(study)}
                      </span>
                    </p>
                  </div>
                  <StatusPill study={study} approved={leader.approved} />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/leader/people?study=${study.id}`}
                    className={`${buttonClass.secondary} ${fresh ? "border-warm/40 bg-warm-soft text-warm" : ""}`}
                  >
                    <Users className="size-4" aria-hidden />
                    {fresh ? `${fresh} new ${fresh === 1 ? "person" : "people"}` : "People"}
                  </Link>
                  <Link href={`/leader/studies/${study.id}`} className={buttonClass.secondary}>
                    <Pencil className="size-4" aria-hidden />
                    Edit
                  </Link>
                  <form action={setStudyStatus.bind(null, study.id, paused ? "active" : "paused")}>
                    <button type="submit" className={buttonClass.secondary}>
                      {paused ? <Play className="size-4" aria-hidden /> : <Pause className="size-4" aria-hidden />}
                      {paused ? "Resume" : "Pause"}
                    </button>
                  </form>
                  {leader.approved && !paused && (
                    <Link href={`/studies/${study.slug}`} className={buttonClass.quiet}>
                      <ExternalLink className="size-4" aria-hidden />
                      View
                    </Link>
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
