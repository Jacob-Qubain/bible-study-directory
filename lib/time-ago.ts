/** "5 minutes ago", "yesterday", "Sep 12" */
export function timeAgo(iso: string, now: number) {
  const minutes = Math.round((now - Date.parse(iso)) / 60_000);
  const rtf = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });
  if (minutes < 60) return rtf.format(-Math.max(minutes, 1), "minute");
  if (minutes < 60 * 24) return rtf.format(-Math.round(minutes / 60), "hour");
  if (minutes < 60 * 24 * 7) return rtf.format(-Math.round(minutes / 1440), "day");
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(iso));
}
