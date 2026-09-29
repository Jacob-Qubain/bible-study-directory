"use client";

import { Select } from "@/components/ui/field";
import { STATUS_LABELS, type InquiryStatus } from "@/lib/leader/inquiry-status";

/** Saves as soon as the leader picks a new status. */
export function StatusSelect({
  id,
  name,
  status,
  action,
}: {
  id: string;
  name: string;
  status: InquiryStatus;
  action: (id: string, formData: FormData) => Promise<void>;
}) {
  return (
    <form action={action.bind(null, id)}>
      <label className="sr-only" htmlFor={`status-${id}`}>
        Status for {name}
      </label>
      <Select
        id={`status-${id}`}
        name="status"
        defaultValue={status}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="h-10 rounded-full border border-line bg-surface pl-4 text-sm font-medium"
      >
        {Object.entries(STATUS_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </Select>
    </form>
  );
}
