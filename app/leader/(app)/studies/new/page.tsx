import type { Metadata } from "next";
import { requireLeader } from "@/lib/auth";
import { getCampuses } from "@/lib/data/studies";
import { getAllTags, getMyStudies } from "@/lib/leader/queries";
import { EMPTY_STUDY } from "@/lib/leader/study-form";
import { StudyForm } from "../study-form";

export const metadata: Metadata = { title: "New study" };

export default async function NewStudyPage() {
  const { supabase, leader } = await requireLeader();
  const [tags, campuses, mine] = await Promise.all([
    getAllTags(supabase),
    getCampuses(),
    getMyStudies(supabase, leader.id),
  ]);
  // Most leaders list every study on the same campus.
  const campusId = mine.at(-1)?.campus.id ?? (campuses.length === 1 ? campuses[0].id : "");
  return (
    <div className="grid max-w-3xl gap-6">
      <h1 className="font-display text-3xl font-semibold">List a new study</h1>
      <StudyForm studyId={null} initial={{ ...EMPTY_STUDY, campusId }} tags={tags} campuses={campuses} />
    </div>
  );
}
