import { json, preflight } from "@/lib/api/http";
import { getActiveCampuses } from "@/lib/data/studies";
import { SITE_URL } from "@/lib/site";

/** GET /api/v1/campuses: campuses with at least one live study. */
export async function GET() {
  const campuses = await getActiveCampuses();
  return json({
    campuses: campuses.map((c) => ({
      slug: c.slug,
      name: c.name,
      city: c.city,
      studyCount: c.studyCount,
      url: `${SITE_URL}/${c.slug}`,
      studiesApi: `${SITE_URL}/api/v1/studies?campus=${c.slug}`,
    })),
  });
}

export const OPTIONS = preflight;
