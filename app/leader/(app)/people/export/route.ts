import { requireLeader } from "@/lib/auth";
import { toCsv, toVCard, type ExportRow } from "@/lib/leader/export";
import { getInquiries, getMyStudies } from "@/lib/leader/queries";

/** GET /leader/people/export?format=vcf|csv[&study=<id>] */
export async function GET(request: Request) {
  const { supabase, leader } = await requireLeader();
  const params = new URL(request.url).searchParams;
  const format = params.get("format") === "csv" ? "csv" : "vcf";

  const studies = await getMyStudies(supabase, leader.id);
  const selected = studies.find((s) => s.id === params.get("study"));
  const scope = selected ? [selected] : studies;
  const titles = new Map(scope.map((s) => [s.id, s.title]));

  // RLS already limits this to the leader's own studies.
  const rows: ExportRow[] = (await getInquiries(supabase, [...titles.keys()]))
    .filter((i) => i.status !== "declined")
    .map((i) => ({ ...i, studyTitle: titles.get(i.studyId) ?? "" }));

  const name = `${selected?.slug ?? "bible-study"}-people.${format}`;
  return new Response(format === "csv" ? toCsv(rows) : toVCard(rows), {
    headers: {
      "Content-Type": format === "csv" ? "text/csv; charset=utf-8" : "text/vcard; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
