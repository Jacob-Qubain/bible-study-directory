"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { buttonClass } from "@/components/ui/field";
import { deleteStudy } from "../actions";

export function DeleteStudyButton({ studyId, title }: { studyId: string; title: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className={`${buttonClass.quiet} text-warm hover:text-warm`}
      onClick={() => {
        if (
          confirm(
            `Delete “${title}” and everyone who asked to join it? This can't be undone. To take a break instead, pause it from your dashboard.`,
          )
        ) {
          startTransition(() => deleteStudy(studyId));
        }
      }}
    >
      <Trash2 className="size-4" aria-hidden />
      {pending ? "Deleting…" : "Delete this study"}
    </button>
  );
}
