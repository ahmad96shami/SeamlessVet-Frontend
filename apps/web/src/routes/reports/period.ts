// Period presets for the report filter bar. The backend report endpoints take `?from=`/`?to=` as
// DateOnly (`YYYY-MM-DD`) and resolve a half-open UTC window with the `to` day fully included. We
// compute ranges from the local calendar (single-center app) and format the bare Y-M-D — native Date
// only, matching the web app's no-date-fns convention (the shared `formatDate` covers display).

export type PeriodPreset = "last30" | "thisMonth" | "quarter" | "year" | "all" | "custom";

export const PERIOD_PRESETS: Exclude<PeriodPreset, "custom">[] = [
  "last30",
  "thisMonth",
  "quarter",
  "year",
  "all",
];

export interface PeriodValue {
  preset: PeriodPreset;
  /** Only meaningful when preset === "custom"; `YYYY-MM-DD` or "". */
  from: string;
  to: string;
}

export const DEFAULT_PERIOD: PeriodValue = { preset: "last30", from: "", to: "" };

/** Local-calendar `YYYY-MM-DD` (not `toISOString`, which would shift across the UTC day boundary). */
export function ymd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Resolve a preset (or custom range) to the `{from, to}` the report endpoints expect. */
export function resolvePeriod(value: PeriodValue): { from?: string; to?: string } {
  if (value.preset === "all") return {};
  if (value.preset === "custom") {
    return { from: value.from || undefined, to: value.to || undefined };
  }
  const today = new Date();
  const to = ymd(today);
  let from: Date;
  switch (value.preset) {
    case "last30":
      from = new Date(today);
      from.setDate(from.getDate() - 29);
      break;
    case "thisMonth":
      from = new Date(today.getFullYear(), today.getMonth(), 1);
      break;
    case "quarter":
      from = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1);
      break;
    case "year":
      from = new Date(today.getFullYear(), 0, 1);
      break;
  }
  return { from: ymd(from), to };
}
