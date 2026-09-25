import { Directory } from "@/components/directory/directory";
import { getStudies } from "@/lib/data/studies";
import { parseFilters, studyArea, ONLINE_AREA } from "@/lib/filters";
import { requestTime } from "@/lib/request-time";
import type { Tag } from "@/lib/types";

export default async function Home(props: PageProps<"/">) {
  const [studies, searchParams] = await Promise.all([getStudies(), props.searchParams]);

  // Only offer filter options that would actually return something.
  const tags = [
    ...new Map(studies.flatMap((s) => s.tags).map((t) => [t.slug, t] as [string, Tag])).values(),
  ].toSorted((a, b) => a.label.localeCompare(b.label));
  const areas = [...new Set(studies.map(studyArea))].toSorted((a, b) =>
    a === ONLINE_AREA ? 1 : b === ONLINE_AREA ? -1 : a.localeCompare(b),
  );

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 pt-10 pb-16 sm:pt-14">
      <header className="grid max-w-2xl gap-3">
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
