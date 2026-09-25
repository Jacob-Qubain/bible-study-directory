/** Only same-site paths, so a sign-in link can't be turned into an open redirect. */
export function safeNext(next: unknown, fallback = "/leader") {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//")
    ? next
    : fallback;
}
