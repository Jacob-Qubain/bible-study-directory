"use client";

import { useEffect, useMemo, useState } from "react";

/**
 * Current time, seeded from the server's request time so the first client
 * render matches the HTML, then ticking for live countdowns.
 */
export function useNow(serverNow: number, intervalMs = 60_000) {
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return useMemo(() => new Date(now), [now]);
}
