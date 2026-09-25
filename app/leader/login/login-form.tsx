"use client";

import { useActionState } from "react";
import { MailCheck } from "lucide-react";
import { buttonClass, describedBy, Field, inputClass } from "@/components/ui/field";
import { sendMagicLink, type LoginState } from "./actions";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(sendMagicLink, {
    status: "idle",
  });

  if (state.status === "sent") {
    return (
      <div className="grid gap-3" role="status">
        <MailCheck className="size-10 text-accent" aria-hidden />
        <h2 className="font-display text-2xl font-semibold">Check your email</h2>
        <p className="text-muted">
          We sent a sign-in link to <strong className="text-ink">{state.email}</strong>. Tap it
          and you&apos;re in — no password needed.
        </p>
        <p className="text-sm text-muted">Not there? Check spam, or refresh this page to try again.</p>
      </div>
    );
  }

  const error = state.status === "error" ? state.message : undefined;
  return (
    <form action={action} className="grid gap-4" noValidate>
      <input type="hidden" name="next" value={next} />
      <Field id="email" label="Email" error={error}>
        <input
          {...describedBy("email", error)}
          type="email"
          autoComplete="email"
          required
          defaultValue={state.status === "error" ? state.email : undefined}
          className={inputClass}
        />
      </Field>
      <button type="submit" disabled={pending} className={buttonClass.primary}>
        {pending ? "Sending…" : "Email me a sign-in link"}
      </button>
    </form>
  );
}
