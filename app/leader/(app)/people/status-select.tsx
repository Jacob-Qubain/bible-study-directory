"use client";

import { updateInquiryStatus } from "./actions";
import type { Inquiry } from "@/lib/leader/queries";

export const STATUS_LABELS: Record<Inquiry["status"], string> = {
  new: "New",
  contacted: "Reached out",
  joined: "Joined",
  declined: "Not a fit",
};

/** Saves as soon as the leader picks a new status. */
export function StatusSelect({ inquiry }: { inquiry: Inquiry }) {
  return (
    <form action={updateInquiryStatus.bind(null, inquiry.id)}>
      <label className="sr-only" htmlFor={`status-${inquiry.id}`}>
        Status for {inquiry.name}
      </label>
      <select
        id={`status-${inquiry.id}`}
        name="status"
        defaultValue={inquiry.status}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="h-10 rounded-full border border-line bg-surface px-3 text-sm font-medium"
      >
        {Object.entries(STATUS_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </form>
  );
}
