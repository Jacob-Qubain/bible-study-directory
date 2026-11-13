"use client";

import { useActionState } from "react";
import { buttonClass, describedBy, Field, inputClass } from "@/components/ui/field";
import { saveProfile, type ProfileState, type ProfileValues } from "./actions";

export function ProfileForm({
  initial,
  submitLabel,
  signInEmail,
}: {
  initial: ProfileValues;
  submitLabel: string;
  /** When given, shows the "send my notifications to" field. */
  signInEmail?: string;
}) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(saveProfile, {
    status: "idle",
  });
  const values = state.status === "error" ? state.values : initial;
  const errors = state.status === "error" ? state.fields : {};
  const phoneHint = "Shown on your studies as “Text” and “WhatsApp” buttons. Leave blank to hide.";

  return (
    <form action={action} className="grid gap-5" noValidate>
      <Field id="name" label="Your name" error={errors.name} hint="As visitors will see it.">
        <input
          {...describedBy("name", errors.name, true)}
          defaultValue={values.name}
          autoComplete="name"
          required
          className={inputClass}
        />
      </Field>

      <Field
        id="bio"
        label="A few sentences about you"
        optional
        error={errors.bio}
        hint="Friendly and short. What would help a nervous first-timer feel welcome?"
      >
        <textarea
          {...describedBy("bio", errors.bio, true)}
          defaultValue={values.bio}
          rows={4}
          className={`${inputClass} h-auto py-3`}
        />
      </Field>

      <Field id="phone" label="Mobile number" optional error={errors.phone} hint={phoneHint}>
        <input
          {...describedBy("phone", errors.phone, phoneHint)}
          type="tel"
          autoComplete="tel"
          defaultValue={values.phone}
          className={inputClass}
        />
      </Field>

      <label className="flex items-center gap-3 text-sm">
        <input
          type="checkbox"
          name="whatsapp"
          defaultChecked={values.whatsapp}
          className="size-5 accent-[var(--accent)]"
        />
        I use WhatsApp on this number
      </label>

      {signInEmail && (
        <Field
          id="notifyEmail"
          label="Send my notifications to"
          optional
          error={errors.notifyEmail}
          hint={`Private. Leave blank to use your sign-in email (${signInEmail}). You still sign in with that one.`}
        >
          <input
            {...describedBy("notifyEmail", errors.notifyEmail, true)}
            type="email"
            autoComplete="email"
            defaultValue={values.notifyEmail}
            placeholder={signInEmail}
            className={inputClass}
          />
        </Field>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={buttonClass.primary}>
          {pending ? "Saving…" : submitLabel}
        </button>
        <p aria-live="polite" className="text-sm">
          {state.status === "saved" && <span className="text-accent">Saved.</span>}
          {state.status === "error" && <span className="text-warm">{state.message}</span>}
        </p>
      </div>
    </form>
  );
}
