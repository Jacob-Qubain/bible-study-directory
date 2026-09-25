import { icsFor } from "@/lib/calendar";
import { getStudy } from "@/lib/data/studies";
import { nextMeeting } from "@/lib/schedule";
import { SITE_URL } from "@/lib/site";

export async function GET(_req: Request, ctx: RouteContext<"/studies/[slug]/calendar.ics">) {
  const { slug } = await ctx.params;
  const study = await getStudy(slug);
  if (!study) return new Response("Not found", { status: 404 });

  return new Response(icsFor(study, nextMeeting(study), SITE_URL), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${study.slug}.ics"`,
    },
  });
}
