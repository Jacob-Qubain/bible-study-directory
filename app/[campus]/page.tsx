import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftRight, GraduationCap } from "lucide-react";
import { RememberCampus } from "@/components/campus/remember-campus";
import { Directory } from "@/components/directory/directory";
import { CHOOSE_CAMPUS_HREF } from "@/lib/campus-cookie";
import { getCampus, getStudies } from "@/lib/data/studies";
import { parseFilters, studyArea, ONLINE_AREA } from "@/lib/filters";
import { requestTime } from "@/lib/request-time";
import type { Tag } from "@/lib/types";

export async function generateMetadata(props: PageProps<"/[campus]">): Promise<Metadata> {
  const campus = await getCampus((await props.params).campus);
  return campus
    ? {
        title: `Bible studies at ${campus.name}`,
        description: `Find a Bible study at ${campus.name} this week. No sign-up, no pressure.`,
      }
    : {};
}

export default async function CampusPage(props: PageProps<"/[campus]">) {
  const [{ campus: slug }, searchParams] = await Promise.all([props.params, props.searchParams]);
  const campus = await getCampus(slug);
  if (!campus) notFound();
  const studies = await getStudies(campus.id);

  // Only offer filter options that would actually return something.
  const tags = [
    ...new Map(studies.flatMap((s) => s.tags).map((t) => [t.slug, t] as [string, Tag])).values(),
  ].toSorted((a, b) => a.label.localeCompare(b.label));
  const areas = [...new Set(studies.map(studyArea))].toSorted((a, b) =>
    a === ONLINE_AREA ? 1 : b === ONLINE_AREA ? -1 : a.localeCompare(b),
  );

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 pt-8 pb-16 sm:pt-12">
      <RememberCampus slug={campus.slug} />
      <header className="grid max-w-2xl gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1.5 text-sm font-semibold text-accent">
            <GraduationCap className="size-4" aria-hidden />
            {campus.name}
          </span>
          <Link
            href={CHOOSE_CAMPUS_HREF}
            className="inline-flex min-h-9 items-center gap-1 rounded-full px-2 text-sm font-medium text-muted hover:text-ink"
          >
            <ArrowLeftRight className="size-3.5" aria-hidden />
            Change campus
          </Link>
        </div>
        <h1 className="font-display text-4xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-5xl">
          Find a Bible study <span className="text-accent italic">this week.</span>
        </h1>
        <p className="text-lg text-muted">
          No sign-up, no pressure. Pick a night that works, say hi to the leader, and show up.
        </p>
      </header>

      <Directory
        studies={studies}
        tags={tags}
        areas={areas}
        initialFilters={parseFilters(searchParams)}
        serverNow={requestTime()}
      />
    </div>
  );
}
