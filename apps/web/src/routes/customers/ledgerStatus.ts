import type { BadgeProps } from "@/components/ui/badge";

/** Ledger-status → Badge tone (open / has_debt / closed). Shared by the customer + farm surfaces. */
export function statusVariant(status: string): BadgeProps["variant"] {
  if (status === "has_debt") return "warning";
  if (status === "closed") return "success";
  return "default"; // open
}

/** Color a balance: positive = owes (red), negative = in credit (green), zero = muted. */
export function balanceClass(balance: number): string {
  if (balance > 0) return "text-destructive";
  if (balance < 0) return "text-success";
  return "text-muted-foreground";
}
