/**
 * Drop keys whose value is a blank/whitespace-only string, so optional text inputs left empty are
 * omitted from a request body (the backend then stores null rather than ""). Numbers, booleans, and
 * non-empty strings pass through. Required fields are validated before submit, so they're never blank.
 */
export function omitEmptyStrings<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string" && value.trim() === "") continue;
    out[key] = value;
  }
  return out as T;
}
