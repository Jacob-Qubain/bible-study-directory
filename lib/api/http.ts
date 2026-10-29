/** Public, read-only data: any site may read it, from a browser or a server. */
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

/** Cached at Vercel's edge for 5 minutes, then refreshed in the background. */
const CACHE = "public, s-maxage=300, stale-while-revalidate=600";

export function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { ...CORS, "Cache-Control": status === 200 ? CACHE : "no-store" },
  });
}

export function preflight() {
  return new Response(null, { status: 204, headers: { ...CORS, "Access-Control-Max-Age": "86400" } });
}
