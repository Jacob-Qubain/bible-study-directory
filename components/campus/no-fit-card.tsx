"use client";

import { useActionState, useState } from "react";
import { CalendarSearch, CircleCheck, MessageSquareText } from "lucide-react";
import { requestStudy, type RequestState } from "@/app/[campus]/actions";
import { Avatar } from "@/components/ui/avatar";
import { buttonClass, describedBy, Field, inputClass } from "@/components/ui/field";
import { SHORT_DAYS, TIMES_OF_DAY, WEEK } from "@/lib/availability";
import type { CampusContact, TimeOfDay } from "@/lib/types";

const chip =
  "inline-flex min-h-10 cursor-pointer items-center rounded-full border border-line px-4 text-sm font-medium has-[:checked]:border-accent has-[:checked]:bg-accent has-[:checked]:text-accent-ink has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[var(--focus)]";

function who(contacts: CampusContact[]) {
  return contacts.length === 1 ? contacts[0].name : "someone from the campus team";
}

/**
 * "Nothing fits your schedule?" Collects when a student is free and sends it
 * to the campus's contacts (or the admins, if it has none). Days and times
 * start from the filters they tried.
 */
export function NoFitCard({
  campusId,
  contacts,
  days,
  times,
}: {
  campusId: string;
  contacts: CampusContact[];
  days: number[];
  times: TimeOfDay[];
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<RequestState, FormData>(
    requestStudy.bind(null, campusId),
    { status: "idle" },
  );
  const errors = state.status === "error" ? state.fields : undefined;
  const values = state.status === "error" ? state.values : undefined;
  const pickedDays = values?.days ?? days;
  const pickedTimes = values?.times ?? times;
  const texters = contacts.filter((c) => c.publicPhone);
  const greeting = encodeURIComponent(
    "Hi! I found Find a Bible Study, but none of the studies fit my schedule. Could you help me find one?",
  );

  return (
    <section
      aria-labelledby="no-fit-heading"
      className="grid gap-5 rounded-2xl border border-line bg-surface-2 p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-start gap-4">
        <CalendarSearch className="mt-1 size-6 shrink-0 text-accent" aria-hidden />
        <div className="grid min-w-0 flex-1 gap-1">
          <h2 id="no-fit-heading" className="font-display text-xl font-semibold">
            Nothing fits your schedule?
          </h2>
          <p className="text-muted">
            Tell us when you&apos;re free and {who(contacts)} will reach out to help you find a study, or
            start a new one.
          </p>
        </div>
      </div>

      {contacts.length > 0 && (
        <ul className="flex flex-wrap gap-x-6 gap-y-3">
          {contacts.map((c) => (
            <li key={c.leaderId} className="flex items-center gap-3 text-sm font-semibold">
              <Avatar leader={{ id: c.leaderId, name: c.name, photoUrl: c.photoUrl }} />
              {c.name}
            </li>
          ))}
        </ul>
      )}

      {state.status === "sent" ? (
        <p role="status" className="flex items-center gap-2 font-semibold">
          <CircleCheck className="size-5 text-accent" aria-hidden />
          Thanks, {state.firstName}! {contacts.length === 1 ? contacts[0].name.split(" ")[0] : "Someone"} will
          reach out soon.
        </p>
      ) : !open ? (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setOpen(true)} className={buttonClass.primary}>
            Tell us when you&apos;re free
          </button>
          {texters.map((c) => (
            <a key={c.leaderId} href={`sms:${c.publicPhone}?&body=${greeting}`} className={buttonClass.secondary}>
              <MessageSquareText className="size-4 text-accent" aria-hidden />
              Text {c.name.split(" ")[0]}
            </a>
          ))}
        </div>
      ) : (
        <form action={action} className="grid gap-4" noValidate>
          <fieldset className="grid gap-2">
            <legend className="text-sm font-medium">Days you could meet</legend>
            <div className="flex flex-wrap gap-2">
              {WEEK.map((d) => (
                <label key={d} className={chip}>
                  <input type="checkbox" name="days" value={d} defaultChecked={pickedDays.includes(d)} className="sr-only" />
                  {SHORT_DAYS[d]}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className="grid gap-2">
            <legend className="text-sm font-medium">Times that work</legend>
            <div className="flex flex-wrap gap-2">
              {TIMES_OF_DAY.map((t) => (
                <label key={t} className={`${chip} capitalize`}>
                  <input type="checkbox" name="times" value={t} defaultChecked={pickedTimes.includes(t)} className="sr-only" />
                  {t}
                </label>
              ))}
            </div>
            <p className="text-sm text-muted">Leave blank if you&apos;re flexible.</p>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="req-name" label="Your name" error={errors?.name}>
              <input
                {...describedBy("req-name", errors?.name)}
                name="name"
                autoComplete="name"
                defaultValue={values?.name}
                className={inputClass}
              />
            </Field>
            <Field id="req-contact" label="Email or phone" error={errors?.contact}>
              <input
                {...describedBy("req-contact", errors?.contact)}
                name="contact"
                autoComplete="email"
                defaultValue={values?.contact}
                className={inputClass}
              />
            </Field>
          </div>
          <Field id="req-message" label="Anything else?" optional>
            <textarea
              id="req-message"
              name="message"
              rows={2}
              defaultValue={values?.message}
              placeholder="e.g. I work Tuesday nights, or I'd love a women's study"
              className={`${inputClass} h-auto py-3`}
            />
          </Field>

          {/* Honeypot for bots — hidden from people and screen readers. */}
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden
            className="absolute -left-[9999px] h-0 w-0 opacity-0"
          />

          {state.status === "error" && !errors && (
            <p role="alert" className="text-sm text-warm">
              {state.message}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={pending} className={buttonClass.primary}>
              {pending ? "Sending…" : "Send"}
            </button>
            <p className="text-sm text-muted">Only the campus team sees this. No account, no spam.</p>
          </div>
        </form>
      )}
    </section>
  );
}
