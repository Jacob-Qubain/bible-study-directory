"use client";

import { useActionState, useState } from "react";
import { CircleCheck, ExternalLink, MapPin } from "lucide-react";
import { inputClass } from "@/components/ui/field";
import { joinStudy, type JoinState } from "./actions";


export function JoinForm({
  studyId,
  hostNames,
  placeName,
}: {
  studyId: string;
  hostNames: string;
  /** Public location, shown as "Where" when the study has no private address. */
  placeName: string | null;
}) {
  const [state, action, pending] = useActionState<JoinState, FormData>(
    joinStudy.bind(null, studyId),
    { status: "idle" },
  );
  const [showNote, setShowNote] = useState(false);

  if (state.status === "success") {
    const { meetingUrl } = state.details;
    const address = state.details.address ?? placeName;
    return (
      <div className="grid gap-3" role="status">
        <p className="flex items-center gap-2 font-display text-xl font-semibold">
          <CircleCheck className="size-6 text-accent" aria-hidden />
          You&apos;re in, {state.firstName}!
        </p>
        <p className="text-muted">
          {hostNames} will reach out to say hi. You don&apos;t need to do anything else — just
          show up.
        </p>
        {address && (
          <p className="flex items-start gap-2 rounded-xl bg-accent-soft p-3 text-sm">
            <MapPin className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
            <span>
              <span className="font-semibold">Where: </span>
              {address}
            </span>
          </p>
        )}
        {meetingUrl && (
          <a
            href={meetingUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-accent-soft p-3 text-sm font-semibold text-accent"
          >
            <ExternalLink className="size-4" aria-hidden />
            Join link — save this
          </a>
        )}
      </div>
    );
  }

  const fieldErrors = state.status === "error" ? state.fields : undefined;
  const values = state.status === "error" ? state.values : undefined;

  return (
    <form action={action} className="grid gap-3" noValidate>
      <div className="grid gap-1">
        <label htmlFor="join-name" className="text-sm font-medium">
          Your name
        </label>
        <input
          id="join-name"
          name="name"
          defaultValue={values?.name}
          autoComplete="name"
          required
          aria-invalid={!!fieldErrors?.name}
          aria-describedby={fieldErrors?.name ? "join-name-error" : undefined}
          className={inputClass}
        />
        {fieldErrors?.name && (
          <p id="join-name-error" className="text-sm text-warm">
            {fieldErrors.name}
          </p>
        )}
      </div>
      <div className="grid gap-1">
        <label htmlFor="join-contact" className="text-sm font-medium">
          Email or phone
        </label>
        <input
          id="join-contact"
          name="contact"
          defaultValue={values?.contact}
          autoComplete="email"
          required
          aria-invalid={!!fieldErrors?.contact}
          aria-describedby={fieldErrors?.contact ? "join-contact-error" : "join-contact-hint"}
          className={inputClass}
        />
        <p
          id={fieldErrors?.contact ? "join-contact-error" : "join-contact-hint"}
          className={`text-sm ${fieldErrors?.contact ? "text-warm" : "text-muted"}`}
        >
          {fieldErrors?.contact ?? `Only ${hostNames} will see this. No account, no spam.`}
        </p>
      </div>

      {showNote ? (
        <div className="grid gap-1">
          <label htmlFor="join-message" className="text-sm font-medium">
            Anything {hostNames} should know? <span className="text-muted">(optional)</span>
          </label>
          <textarea
            id="join-message"
            name="message"
            defaultValue={values?.message}
            rows={3}
            className={`${inputClass} h-auto py-3`}
            autoFocus
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowNote(true)}
          className="justify-self-start text-sm font-medium text-accent hover:underline"
        >
          + Add a note
        </button>
      )}

      {/* Honeypot for bots — hidden from people and screen readers. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
      />

      {state.status === "error" && !fieldErrors && (
        <p className="text-sm text-warm" role="alert">
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 inline-flex min-h-12 items-center justify-center rounded-full bg-accent px-6 text-base font-semibold text-accent-ink transition hover:bg-accent-hover disabled:opacity-60"
      >
        {pending ? "Sending…" : "Count me in"}
      </button>
    </form>
  );
}
