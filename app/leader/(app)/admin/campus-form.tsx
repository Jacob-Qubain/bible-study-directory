"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { buttonClass, Field, inputClass, Select } from "@/components/ui/field";
import { slugify } from "@/lib/slugify";
import { US_TIMEZONES } from "@/lib/timezones";
import { addCampus, type CampusFormState } from "./campus-actions";

type Values = { name: string; city: string; slug: string; timezone: string };

/** The web address follows the name until the admin edits it by hand. */
function CampusFields({ initial }: { initial?: Values }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [customSlug, setCustomSlug] = useState<string | null>(initial?.slug || null);
  const slug = customSlug ?? slugify(name);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field id="campus-name" label="Campus name">
        <input
          id="campus-name"
          name="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Baylor University"
          className={inputClass}
        />
      </Field>
      <Field id="campus-city" label="City" optional>
        <input
          id="campus-city"
          name="city"
          defaultValue={initial?.city}
          placeholder="Waco, TX"
          className={inputClass}
        />
      </Field>
      <Field id="campus-slug" label="Web address" hint={`findabiblestudy.org/${slug || "…"}`}>
        <input
          id="campus-slug"
          name="slug"
          value={slug}
          onChange={(e) => setCustomSlug(e.target.value.toLowerCase())}
          aria-describedby="campus-slug-desc"
          className={inputClass}
        />
      </Field>
      <Field id="campus-timezone" label="Timezone">
        <Select
          id="campus-timezone"
          name="timezone"
          defaultValue={initial?.timezone ?? "America/Chicago"}
          className={inputClass}
        >
          {US_TIMEZONES.map(([tz, label]) => (
            <option key={tz} value={tz}>
              {label}
            </option>
          ))}
        </Select>
      </Field>
    </div>
  );
}

export function CampusForm() {
  const [state, action, pending] = useActionState<CampusFormState, FormData>(addCampus, {
    status: "idle",
  });

  return (
    <form action={action} className="grid gap-4 rounded-2xl border border-line bg-surface p-5">
      {/* Remounts with blank fields after each successful add. */}
      <CampusFields
        key={state.status === "added" ? state.slug : "draft"}
        initial={state.status === "error" ? state.values : undefined}
      />
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={buttonClass.primary}>
          <Plus className="size-4" aria-hidden />
          {pending ? "Adding…" : "Add campus"}
        </button>
        <p aria-live="polite" className="text-sm">
          {state.status === "added" && <span className="text-accent">Added {state.name}.</span>}
          {state.status === "error" && <span className="text-warm">{state.message}</span>}
        </p>
      </div>
    </form>
  );
}
