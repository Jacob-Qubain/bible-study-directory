"use client";

import { updateInquiryStatus } from "./actions";
import { STATUS_LABELS } from "@/lib/leader/inquiry-status";
import type { Inquiry } from "@/lib/leader/queries";


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
