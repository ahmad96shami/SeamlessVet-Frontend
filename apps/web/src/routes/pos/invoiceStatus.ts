import type { BadgeProps } from "@/components/ui/badge";

/** Badge tone per invoice status: issued = green, flagged = amber, void = gray. */
export function invoiceStatusVariant(status: string): BadgeProps["variant"] {
  if (status === "issued") return "success";
  if (status === "flagged") return "warning";
  return "secondary"; // void (+ unknown)
}
