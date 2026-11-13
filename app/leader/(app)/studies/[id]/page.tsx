import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireLeader } from "@/lib/auth";
import { getCampuses } from "@/lib/data/studies";
import { getAllTags, getEditableStudy } from "@/lib/leader/queries";
import { studyToFormValues } from "@/lib/leader/study-form";
import { StudyForm } from "../study-form";
import { DeleteStudyButton } from "./delete-button";
import { LeadersSection } from "./leaders-section";

export const metadata: Metadata = { title: "Edit study" };

export default async function EditStudyPage(props: PageProps<"/leader/studies/[id]">) {
  const { id } = await props.params;
  const { supabase, leader } = await requireLeader();
  const [study, tags, campuses] = await Promise.all([
    getEditableStudy(supabase, id, leader),
    getAllTags(supabase),
    getCampuses(),
  ]);
  if (!study) notFound();

  // Admins manage who leads the study.
  let leaderAdmin: Parameters<typeof LeadersSection>[0] | null = null;
  if (leader.isAdmin) {
    const [current, all] = await Promise.all([
      supabase
        .from("study_leaders")
        .select("sort_order, leaders ( id, name, auth_user_id )")
        .eq("study_id", study.id)
        .order("sort_order"),
      supabase.rpc("admin_list_leaders"),
    ]);
    if (current.error ?? all.error) throw new Error((current.error ?? all.error)!.message);
    const leaders = (
      current.data as unknown as { leaders: { id: string; name: string; auth_user_id: string | null } | null }[]
    ).flatMap(({ leaders: l }) => (l ? [{ id: l.id, name: l.name, invited: !l.auth_user_id }] : []));
    const options = (all.data as { id: string; name: string; approved: boolean }[])
      .filter((l) => l.approved && !leaders.some((c) => c.id === l.id))
      .map(({ id, name }) => ({ id, name }))
      .toSorted((a, b) => a.name.localeCompare(b.name));
    leaderAdmin = { studyId: study.id, leaders, options };
  }

  return (
    <div className="grid max-w-3xl gap-6">
      <h1 className="font-display text-3xl font-semibold">Edit “{study.title}”</h1>
      <StudyForm
        studyId={study.id}
        initial={studyToFormValues(study, study)}
        tags={tags}
        campuses={campuses}
      />
      {leaderAdmin && <LeadersSection {...leaderAdmin} />}
      <div className="border-t border-line pt-6">
        <DeleteStudyButton studyId={study.id} title={study.title} />
      </div>
    </div>
  );
}
