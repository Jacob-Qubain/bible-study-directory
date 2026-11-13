"use client";

import { useActionState, useState } from "react";
import { UserPlus, X } from "lucide-react";
import { buttonClass, Field, inputClass, Select } from "@/components/ui/field";
import { addStudyLeader, removeStudyLeader, type AddLeaderState } from "./leader-actions";
import { NEW_LEADER } from "./new-leader";

export interface StudyLeaderRow {
  id: string;
  name: string;
  /** Listed by an admin and hasn't signed in yet. */
  invited: boolean;
}

/** Admin only: who leads this study. Every leader gets the "wants to join" emails. */
export function LeadersSection({
  studyId,
  leaders,
  options,
}: {
  studyId: string;
  leaders: StudyLeaderRow[];
  /** Approved leaders who don't lead this study yet. */
  options: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState<AddLeaderState, FormData>(
    addStudyLeader.bind(null, studyId),
    { status: "idle" },
  );
  const values = state.status === "error" ? state.values : undefined;
  const [choice, setChoice] = useState("");
  // Clear the dropdown once an add succeeds (state adjusted during render).
  const [handled, setHandled] = useState(state);
  if (state !== handled) {
    setHandled(state);
    if (state.status === "added") setChoice("");
  }

  return (
    <section
      aria-labelledby="leaders-heading"
      className="grid gap-4 rounded-2xl border border-line bg-surface p-5 sm:p-6"
    >
      <div className="grid gap-1">
        <h2 id="leaders-heading" className="font-display text-xl font-semibold">
          Leaders
        </h2>
        <p className="text-sm text-muted">
          Everyone here is shown on the study, can edit it, and gets an email when someone wants to
          come.
        </p>
      </div>

      <ul className="grid gap-2">
        {leaders.map((l) => (
          <li
            key={l.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line px-4 py-2"
          >
            <p className="font-medium">
              {l.name}
              {l.invited && (
                <span className="ml-2 rounded-full bg-warm-soft px-2 py-0.5 text-xs font-semibold text-warm">
                  Invite sent
                </span>
              )}
            </p>
            {leaders.length > 1 ? (
              <form action={removeStudyLeader.bind(null, studyId, l.id)}>
                <button type="submit" className={`${buttonClass.quiet} text-warm hover:text-warm`}>
                  <X className="size-4" aria-hidden />
                  Remove
                </button>
              </form>
            ) : (
              <p className="text-sm text-muted">Add another leader before removing this one.</p>
            )}
          </li>
        ))}
      </ul>

      {/* Remounts with blank fields after each successful add. */}
      <form
        key={state.status === "added" ? `${leaders.length}` : "draft"}
        action={action}
        className="grid gap-4 border-t border-line pt-4"
      >
        <Field id="leaderId" label="Add a leader">
          <Select
            id="leaderId"
            name="leaderId"
            value={choice}
            onChange={(e) => setChoice(e.target.value)}
          >
            <option value="">Choose a leader…</option>
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
            <option value={NEW_LEADER}>Someone new…</option>
          </Select>
        </Field>
        {choice === NEW_LEADER && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="new-leader-name" label="Their name">
              <input
                id="new-leader-name"
                name="name"
                autoComplete="off"
                defaultValue={values?.name}
                className={inputClass}
              />
            </Field>
            <Field
              id="new-leader-email"
              label="Their email"
              hint="Signing in with this email lets them manage the study."
            >
              <input
                id="new-leader-email"
                name="email"
                type="email"
                autoComplete="off"
                defaultValue={values?.email}
                aria-describedby="new-leader-email-desc"
                className={inputClass}
              />
            </Field>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={pending || !choice} className={buttonClass.secondary}>
            <UserPlus className="size-4" aria-hidden />
            {pending ? "Adding…" : "Add leader"}
          </button>
          <p aria-live="polite" className="text-sm">
            {state.status === "added" && (
              <span className="text-accent">Added {state.name}. We emailed them to let them know.</span>
            )}
            {state.status === "error" && <span className="text-warm">{state.message}</span>}
          </p>
        </div>
      </form>
    </section>
  );
}
