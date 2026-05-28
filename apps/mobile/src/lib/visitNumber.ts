/**
 * Mints the next `{prefix}-{seq}` visit_number from the local SQLite visits the doctor has
 * already authored. Mirrors the server-side {@link VisitNumberGenerator} (vet-backend
 * Infrastructure/Visits), so a client-minted number lands valid against the
 * VisitNumberValidator on `/sync/visits` PUT.
 *
 * Returns `null` when the doctor has no `numberPrefix` assigned — the server then
 * keeps `visit_number` null (matching the web behaviour for visits a non-prefixed
 * user creates).
 *
 * The seq counter is monotonic per local device: any visit (open or terminal) that
 * already carries a `{prefix}-N` reserves N. We scan only rows with this exact
 * prefix to avoid collisions if the admin ever reassigns the doctor's prefix.
 */
export function nextVisitNumber(
  prefix: string | null | undefined,
  existing: ReadonlyArray<{ visit_number: string | null }>,
): string | null {
  if (!prefix) return null;

  let maxSeq = 0;
  const pattern = new RegExp(`^${escapeRegExp(prefix)}-(\\d+)$`);
  for (const row of existing) {
    if (!row.visit_number) continue;
    const m = pattern.exec(row.visit_number);
    if (!m) continue;
    const n = Number(m[1]);
    if (Number.isFinite(n) && n > maxSeq) maxSeq = n;
  }
  return `${prefix}-${maxSeq + 1}`;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
