import type { Metadata } from "next";
import { requireLeader } from "@/lib/auth";
import { getAllTags } from "@/lib/leader/queries";
import { EMPTY_STUDY } from "@/lib/leader/study-form";
import { StudyForm } from "../study-form";

export const metadata: Metadata = { title: "New study" };

export default async function NewStudyPage() {
  const { supabase } = await requireLeader();
  const tags = await getAllTags(supabase);
  return (
    <div className="grid max-w-3xl gap-6">
      <h1 className="font-display text-3xl font-semibold">List a new study</h1>
      <StudyForm studyId={null} initial={EMPTY_STUDY} tags={tags} />
    </div>
  );
}
