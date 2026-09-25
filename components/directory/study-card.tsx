import Link from "next/link";
import { CalendarDays, Clock, MapPin } from "lucide-react";
import { AvatarStack, leaderNames } from "@/components/ui/avatar";
import { FormatBadge, Perks, locationLabel } from "@/components/study-badges";
import { cadenceLabel, relativeLabel } from "@/lib/schedule";
import type { Study } from "@/lib/types";

export function StudyCard({ study, next, now }: { study: Study; next: Date; now: Date }) {
  const soon = next.getTime() - now.getTime() < 2 * 86_400_000;
  return (
    <article className="group relative flex h-full flex-col gap-4 rounded-2xl border border-line bg-surface p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-display text-xl leading-tight font-semibold text-balance">
          <Link href={`/studies/${study.slug}`} className="after:absolute after:inset-0 after:rounded-2xl">
            {study.title}
          </Link>
        </h2>
        <FormatBadge format={study.format} />
      </div>

      <p className="text-muted">{study.summary}</p>

      <dl className="grid gap-2 text-sm">
        <div className="flex items-center gap-2">
          <dt className="sr-only">Next meeting</dt>
          <Clock className={`size-4 shrink-0 ${soon ? "text-warm" : "text-muted"}`} aria-hidden />
          <dd className={soon ? "font-semibold text-warm" : "font-medium"}>
            {relativeLabel(study, next, now)}
          </dd>
        </div>
        <div className="flex items-center gap-2">
          <dt className="sr-only">Schedule</dt>
          <CalendarDays className="size-4 shrink-0 text-muted" aria-hidden />
          <dd>{cadenceLabel(study)}</dd>
        </div>
        <div className="flex items-center gap-2">
          <dt className="sr-only">Where</dt>
          <MapPin className="size-4 shrink-0 text-muted" aria-hidden />
          <dd className="truncate">{locationLabel(study)}</dd>
        </div>
      </dl>

      <Perks study={study} />

      <div className="mt-auto flex items-center gap-3 border-t border-line pt-4">
        <AvatarStack leaders={study.leaders} size="sm" />
        <p className="text-sm">
          <span className="text-muted">Led by </span>
          <span className="font-medium">{leaderNames(study.leaders)}</span>
        </p>
      </div>
    </article>
  );
}
