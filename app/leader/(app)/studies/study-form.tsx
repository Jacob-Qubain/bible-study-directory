"use client";

import { useActionState, useState, type ReactNode } from "react";
import Link from "next/link";
import { Lock } from "lucide-react";
import { buttonClass, describedBy, Field, inputClass, Notice } from "@/components/ui/field";
import { FORMAT_LABELS } from "@/components/study-badges";
import type { StudyFormValues } from "@/lib/leader/study-form";
import type { StudyFormat, Tag } from "@/lib/types";
import { saveStudy, type StudyFormState } from "./actions";

const DURATIONS = [30, 45, 60, 75, 90, 120, 150, 180];
const TIMEZONES = [
  ["America/New_York", "Eastern"],
  ["America/Chicago", "Central"],
  ["America/Denver", "Mountain"],
  ["America/Phoenix", "Arizona"],
  ["America/Los_Angeles", "Pacific"],
  ["America/Anchorage", "Alaska"],
  ["Pacific/Honolulu", "Hawaii"],
];

function durationLabel(m: number) {
  return m < 60 ? `${m} min` : `${m / 60} hr${m > 60 ? "s" : ""}`.replace(".5", "½");
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="grid gap-5 rounded-2xl border border-line bg-surface p-5 sm:p-6">
      <legend className="px-1 font-display text-xl font-semibold">{title}</legend>
      {children}
    </fieldset>
  );
}

const PrivateHint = ({ children }: { children: ReactNode }) => (
  <span className="inline-flex items-center gap-1">
    <Lock className="size-3.5" aria-hidden />
    {children}
  </span>
);

export function StudyForm({
  studyId,
  initial,
  tags,
}: {
  studyId: string | null;
  initial: StudyFormValues;
  tags: Tag[];
}) {
  const [state, action, pending] = useActionState<StudyFormState, FormData>(
    saveStudy.bind(null, studyId),
    { status: "idle" },
  );
  const values = state.status === "error" ? state.values : initial;
  const errors = state.status === "error" ? state.fields : {};
  const [format, setFormat] = useState<StudyFormat>(values.format);

  const input = (id: keyof StudyFormValues, hint?: ReactNode) => ({
    ...describedBy(id, errors[id], hint),
    className: inputClass,
  });
  const timezones = TIMEZONES.some(([tz]) => tz === values.timezone)
    ? TIMEZONES
    : [...TIMEZONES, [values.timezone, values.timezone]];

  return (
    <form action={action} className="grid gap-6" noValidate>
      {state.status === "error" && <Notice tone="warn">{state.message}</Notice>}

      <Section title="The basics">
        <Field id="title" label="Name" error={errors.title}>
          <input {...input("title")} defaultValue={values.title} required placeholder="Tuesday Night in Mark" />
        </Field>
        <Field id="summary" label="One-line pitch" error={errors.summary} hint="Shown on the directory card.">
          <input
            {...input("summary", true)}
            defaultValue={values.summary}
            required
            maxLength={200}
            placeholder="A relaxed walk through Mark over a home-cooked dinner."
          />
        </Field>
        <Field
          id="description"
          label="What to expect"
          optional
          error={errors.description}
          hint="Walk a first-timer through an evening. Do they need to bring anything? Will they be put on the spot?"
        >
          <textarea
            {...input("description", true)}
            defaultValue={values.description}
            rows={5}
            className={`${inputClass} h-auto py-3`}
          />
        </Field>
        <Field id="curriculum" label="What you're reading" optional error={errors.curriculum}>
          <input {...input("curriculum")} defaultValue={values.curriculum} placeholder="The Gospel of Mark" />
        </Field>
      </Section>

      <Section title="When">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            id="date"
            label="First meeting"
            error={errors.date}
            hint="When it started or will start. Sets the weekday; moving days? Pick the first meeting on the new day."
          >
            <input {...input("date", true)} type="date" defaultValue={values.date} required />
          </Field>
          <Field id="time" label="Start time" error={errors.time}>
            <input {...input("time")} type="time" defaultValue={values.time} required />
          </Field>
          <Field id="cadence" label="How often" error={errors.cadence}>
            <select {...input("cadence")} defaultValue={values.cadence}>
              <option value="weekly">Every week</option>
              <option value="biweekly">Every other week</option>
            </select>
          </Field>
          <Field id="duration" label="How long" error={errors.duration}>
            <select {...input("duration")} defaultValue={values.duration}>
              {DURATIONS.map((m) => (
                <option key={m} value={m}>
                  {durationLabel(m)}
                </option>
              ))}
            </select>
          </Field>
          <Field id="timezone" label="Timezone" error={errors.timezone}>
            <select {...input("timezone")} defaultValue={values.timezone}>
              {timezones.map(([tz, label]) => (
                <option key={tz} value={tz}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Section>

      <Section title="Where">
        <div role="radiogroup" aria-label="Format" className="flex flex-wrap gap-2">
          {(Object.entries(FORMAT_LABELS) as [StudyFormat, string][]).map(([value, label]) => (
            <label
              key={value}
              className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full border border-line px-4 text-sm font-medium has-[:checked]:border-accent has-[:checked]:bg-accent has-[:checked]:text-accent-ink has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[var(--focus)]"
            >
              <input
                type="radio"
                name="format"
                value={value}
                checked={format === value}
                onChange={() => setFormat(value)}
                className="sr-only"
              />
              {label}
            </label>
          ))}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            id="locationName"
            label={format === "online" ? "Platform" : "Where you meet"}
            optional={format === "online"}
            error={errors.locationName}
            hint={format === "online" ? "e.g. Zoom" : "Public. e.g. Newman Center, Room 214"}
          >
            <input {...input("locationName", true)} defaultValue={values.locationName} />
          </Field>
          {format !== "online" && (
            <Field
              id="neighborhood"
              label="Area"
              optional
              error={errors.neighborhood}
              hint="Public. e.g. North Campus. Helps people filter by area."
            >
              <input {...input("neighborhood", true)} defaultValue={values.neighborhood} />
            </Field>
          )}
        </div>

        {format !== "online" && (
          <Field
            id="address"
            label="Address or directions"
            optional
            error={errors.address}
            hint={
              <PrivateHint>
                Private: shown only to people who join. Skip it if the place above says it all.
              </PrivateHint>
            }
          >
            <input {...input("address", true)} defaultValue={values.address} />
          </Field>
        )}
        {format !== "in_person" && (
          <Field
            id="meetingUrl"
            label="Video link"
            error={errors.meetingUrl}
            hint={<PrivateHint>Private: shown only to people who join.</PrivateHint>}
          >
            <input
              {...input("meetingUrl", true)}
              type="url"
              inputMode="url"
              defaultValue={values.meetingUrl}
              placeholder="https://zoom.us/j/…"
            />
          </Field>
        )}
      </Section>

      <Section title="Hospitality">
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            name="childcare"
            defaultChecked={values.childcare}
            className="size-5 accent-[var(--accent)]"
          />
          Childcare provided
        </label>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="food" label="Food" error={errors.food}>
            <select {...input("food")} defaultValue={values.food}>
              <option value="none">None</option>
              <option value="snacks">Snacks</option>
              <option value="meal">A meal</option>
            </select>
          </Field>
          <Field id="capacity" label="Room for about" optional error={errors.capacity}>
            <input {...input("capacity")} type="number" inputMode="numeric" min={1} defaultValue={values.capacity} />
          </Field>
        </div>
      </Section>

      <Section title="Who it's for">
        {(["audience", "topic"] as const).map((category) => (
          <div key={category} className="grid gap-2">
            <p className="text-sm font-medium">{category === "audience" ? "Audience" : "Focus"}</p>
            <div className="flex flex-wrap gap-2">
              {tags
                .filter((t) => t.category === category)
                .map((t) => (
                  <label
                    key={t.slug}
                    className="inline-flex min-h-10 cursor-pointer items-center rounded-full border border-line px-4 text-sm font-medium has-[:checked]:border-accent has-[:checked]:bg-accent has-[:checked]:text-accent-ink has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[var(--focus)]"
                  >
                    <input
                      type="checkbox"
                      name="tags"
                      value={t.slug}
                      defaultChecked={values.tags.includes(t.slug)}
                      className="sr-only"
                    />
                    {t.label}
                  </label>
                ))}
            </div>
          </div>
        ))}
      </Section>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={buttonClass.primary}>
          {pending ? "Saving…" : studyId ? "Save changes" : "Publish study"}
        </button>
        <Link href="/leader" className={buttonClass.quiet}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
