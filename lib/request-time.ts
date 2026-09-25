/**
 * Timestamp for the current request. Server Components render once per
 * request, so this is stable for a render; client code reads it as a prop.
 */
export function requestTime() {
  return Date.now();
}
