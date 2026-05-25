import type { BadgeProps } from "@/components/ui/badge";

/** Badge tone per appointment status — reused by the calendar, list cells, and the detail bar. */
export function appointmentStatusVariant(status: string): BadgeProps["variant"] {
  switch (status) {
    case "confirmed":
      return "default"; // teal
    case "attended":
      return "success"; // green
    case "no_show":
      return "warning"; // amber
    case "cancelled":
      return "secondary"; // gray
    default:
      return "navy"; // scheduled
  }
}

export interface BlockTone {
  bg: string;
  border: string;
  text: string;
}

// Calendar-block fills, status-coded (the WEB plan colours cards "by status"). Values reuse the
// design's tokens (navy/teal/green/amber) bridged onto the web theme, plus a muted gray for cancelled.
const SCHEDULED_TONE: BlockTone = {
  bg: "#EEF2F8",
  border: "rgba(34,61,105,0.25)",
  text: "var(--navy-900)",
};
const TONES: Record<string, BlockTone> = {
  scheduled: SCHEDULED_TONE,
  confirmed: { bg: "var(--teal-50)", border: "var(--teal-200)", text: "var(--teal-700)" },
  attended: { bg: "var(--green-soft)", border: "rgba(43,182,115,0.40)", text: "#19694e" },
  no_show: { bg: "var(--amber-soft)", border: "rgba(244,180,0,0.45)", text: "#8b6500" },
  cancelled: { bg: "var(--ink-50)", border: "var(--ink-100)", text: "var(--ink-500)" },
};
export function appointmentBlockTone(status: string): BlockTone {
  return TONES[status] ?? SCHEDULED_TONE;
}

/** Two-letter initials for a doctor badge ("د. أحمد السوسي" → "أس"; "Sami Khalil" → "SK"). */
export function doctorInitials(name: string): string {
  const cleaned = name
    .replace(/^د\.?\s*/u, "")
    .replace(/^dr\.?\s*/iu, "")
    .trim();
  const parts = cleaned.split(/\s+/u).filter(Boolean);
  const first = parts[0] ?? "";
  if (parts.length <= 1) return first.slice(0, 2) || "—";
  const second = parts[1] ?? "";
  return (first[0] ?? "") + (second[0] ?? "") || "—";
}
