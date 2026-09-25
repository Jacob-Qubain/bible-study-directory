import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireLeader } from "@/lib/auth";
import { getAllTags, getEditableStudy } from "@/lib/leader/queries";
import { studyToFormValues } from "@/lib/leader/study-form";
import { requestTime } from "@/lib/request-time";
import { StudyForm } from "../study-form";
import { DeleteStudyButton } from "./delete-button";

export const metadata: Metadata = { title: "Edit study" };

export default async function EditStudyPage(props: PageProps<"/leader/studies/[id]">) {
  const { id } = await props.params;
  const { supabase, leader } = await requireLeader();
  const [study, tags] = await Promise.all([
    getEditableStudy(supabase, id, leader.id),
    getAllTags(supabase),
  ]);
  if (!study) notFound();

  return (
    <div className="grid max-w-3xl gap-6">
      <h1 className="font-display text-3xl font-semibold">Edit “{study.title}”</h1>
      <StudyForm
        studyId={study.id}
        initial={studyToFormValues(study, study, new Date(requestTime()))}
        tags={tags}
      />
      <div className="border-t border-line pt-6">
        <DeleteStudyButton studyId={study.id} title={study.title} />
      </div>
    </div>
  );
}
