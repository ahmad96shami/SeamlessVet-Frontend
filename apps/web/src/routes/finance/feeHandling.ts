/** M28 — how a batch's supervision fee is handled, derived from the entitlement toggle + system. */
export type FeeHandling = "subtractedA" | "addedB" | "retainedOff" | "none";

/**
 * Resolve the fee handling (drives the badge on the profit + settlement screens):
 * - System A (`drug_profit`), on  → subtracted from the clinic's drug margin to pay the doctor.
 * - System B (`direct_fee`), on   → charged to the farmer (added at settlement) and passed to the doctor.
 * - System B, off                 → still charged to the farmer, but retained by the clinic.
 * - System A off / no system       → no doctor entitlement, no fee.
 */
export function feeHandling(
  enabled: boolean | null | undefined,
  system: string | null | undefined,
): FeeHandling {
  if (system === "direct_fee") return enabled ? "addedB" : "retainedOff";
  if (system === "drug_profit") return enabled ? "subtractedA" : "none";
  return "none";
}
