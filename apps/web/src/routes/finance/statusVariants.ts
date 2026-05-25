import type { BadgeProps } from "@/components/ui/badge";

type Variant = BadgeProps["variant"];

/** Status → Badge tone mappings shared across the finance screens (onto the design's `.pill` tones). */
export const contractStatusVariant = (status: string): Variant =>
  status === "active"
    ? "success"
    : status === "draft"
      ? "warning"
      : status === "completed"
        ? "navy"
        : "secondary";

export const batchStatusVariant = (status: string): Variant =>
  status === "open" ? "warning" : "navy";

export const entitlementStatusVariant = (status: string): Variant =>
  status === "paid" ? "success" : status === "approved" ? "default" : "warning";
