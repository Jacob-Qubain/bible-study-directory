"use client";

import { useState, useTransition } from "react";
import { UserMinus } from "lucide-react";
import { buttonClass } from "@/components/ui/field";
import { removeInquiry } from "./actions";

export function RemovePersonButton({ inquiryId, name }: { inquiryId: string; name: string }) {
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);

  return (
    <div className="ml-auto flex items-center gap-2">
      {failed && (
        <p role="alert" className="text-sm text-warm">
          Couldn&apos;t remove. Try again.
        </p>
      )}
      <button
        type="button"
        disabled={pending}
        className={`${buttonClass.quiet} text-warm hover:text-warm`}
        onClick={() => {
          if (!confirm(`Remove ${name} from your list? This can't be undone.`)) return;
          setFailed(false);
          startTransition(async () => {
            try {
              await removeInquiry(inquiryId);
            } catch {
              setFailed(true);
            }
          });
        }}
      >
        <UserMinus className="size-4" aria-hidden />
        {pending ? "Removing…" : "Remove"}
      </button>
    </div>
  );
}
