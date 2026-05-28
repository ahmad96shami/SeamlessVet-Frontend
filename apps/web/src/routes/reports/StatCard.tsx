import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type StatTone = "teal" | "amber" | "green" | "navy" | "red";

/** A KPI tile in the design's `.stat` style (icon chip + big value + label). */
export function StatCard({
  icon,
  tone = "teal",
  value,
  label,
  isLoading,
}: {
  icon: ReactNode;
  tone?: StatTone;
  value: ReactNode;
  label: ReactNode;
  /** Renders a shimmer block in place of the value while data is in flight. */
  isLoading?: boolean;
}) {
  return (
    <div className="stat">
      <div className={cn("stat-ico", tone !== "teal" && tone)}>{icon}</div>
      <div className="stat-val">
        {isLoading ? <span className="skeleton" style={{ width: 80, height: 22 }} /> : value}
      </div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
