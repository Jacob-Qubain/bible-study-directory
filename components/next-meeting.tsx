"use client";

import { formatMeetingDate, nextMeeting, relativeLabel } from "@/lib/schedule";
import { useNow } from "@/lib/use-now";
import type { Study } from "@/lib/types";

/** Live "Tomorrow at 6:30pm" headline with the full date underneath. */
export function NextMeeting({ study, serverNow }: { study: Study; serverNow: number }) {
  const now = useNow(serverNow, 30_000);
  const next = nextMeeting(study, now);
  return (
    <div className="grid gap-1">
      <p className="text-sm font-semibold tracking-wide text-muted uppercase">Next meeting</p>
      <p className="font-display text-2xl font-semibold text-warm">{relativeLabel(study, next, now)}</p>
      <p className="text-sm text-muted">{formatMeetingDate(study, next)}</p>
    </div>
  );
}
