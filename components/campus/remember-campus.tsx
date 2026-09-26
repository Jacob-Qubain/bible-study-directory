"use client";

import { useEffect } from "react";
import { CAMPUS_COOKIE, CAMPUS_COOKIE_MAX_AGE } from "@/lib/campus-cookie";

/** Saves the campus being viewed, so the next visit to "/" goes straight back to it. */
export function RememberCampus({ slug }: { slug: string }) {
  useEffect(() => {
    document.cookie = `${CAMPUS_COOKIE}=${encodeURIComponent(slug)}; path=/; max-age=${CAMPUS_COOKIE_MAX_AGE}; samesite=lax`;
  }, [slug]);
  return null;
}
