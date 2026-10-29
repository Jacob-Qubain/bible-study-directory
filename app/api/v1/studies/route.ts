import { json, preflight } from "@/lib/api/http";
import { toApiStudy } from "@/lib/api/studies";
import { getCampus, getStudies } from "@/lib/data/studies";

/**
 * GET /api/v1/studies[?campus=<slug>]
 * Every active, publicly listed study (optionally for one campus), soonest
 * next meeting first.
 */
export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get("campus");
  const campus = slug ? await getCampus(slug) : null;
  if (slug && !campus) {
    return json({ error: `No campus "${slug}". See /api/v1/campuses for the list.` }, 404);
  }

  const now = new Date();
  const studies = (await getStudies(campus?.id))
    .map((s) => toApiStudy(s, now))
    .toSorted((a, b) => a.schedule.nextMeeting.localeCompare(b.schedule.nextMeeting));

  return json({
    campus: campus && { slug: campus.slug, name: campus.name },
    count: studies.length,
    generatedAt: now.toISOString(),
    studies,
  });
}

export const OPTIONS = preflight;
