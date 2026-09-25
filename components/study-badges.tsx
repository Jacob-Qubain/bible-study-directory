import { Baby, Laptop, MapPin, MonitorSmartphone, Utensils, Cookie } from "lucide-react";
import type { Study, StudyFormat } from "@/lib/types";

export const FORMAT_LABELS: Record<StudyFormat, string> = {
  in_person: "In person",
  online: "Online",
  hybrid: "Hybrid",
};

const FORMAT_ICONS = { in_person: MapPin, online: Laptop, hybrid: MonitorSmartphone };

export function FormatBadge({ format }: { format: StudyFormat }) {
  const Icon = FORMAT_ICONS[format];
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium whitespace-nowrap text-muted">
      <Icon className="size-3.5" aria-hidden />
      {FORMAT_LABELS[format]}
    </span>
  );
}

/** Hospitality details that remove excuses: kids, food. */
export function Perks({ study }: { study: Study }) {
  const perks = [
    study.childcare && { icon: Baby, label: "Childcare" },
    study.food === "meal" && { icon: Utensils, label: "Dinner provided" },
    study.food === "snacks" && { icon: Cookie, label: "Snacks" },
  ].filter(Boolean) as { icon: typeof Baby; label: string }[];

  if (!perks.length) return null;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {perks.map(({ icon: Icon, label }) => (
        <li
          key={label}
          className="inline-flex items-center gap-1 rounded-full bg-warm-soft px-2.5 py-1 text-xs font-medium text-warm"
        >
          <Icon className="size-3.5" aria-hidden />
          {label}
        </li>
      ))}
    </ul>
  );
}

export function locationLabel(study: Study) {
  if (study.format === "online") return study.locationName ?? "Online";
  return [study.locationName, study.neighborhood].filter(Boolean).join(" · ");
}
