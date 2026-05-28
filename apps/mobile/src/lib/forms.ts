/**
 * Drop keys whose value is a blank/whitespace-only string, so optional text inputs left empty
 * are omitted from the request body (the backend then stores null rather than ""). Mirrors
 * the web helper at apps/web/src/lib/forms.ts.
 */
export function omitEmptyStrings<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string" && value.trim() === "") continue;
    out[key] = value;
  }
  return out as T;
}
