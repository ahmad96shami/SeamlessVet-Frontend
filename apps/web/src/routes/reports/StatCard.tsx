import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type StatTone = "teal" | "amber" | "green" | "navy" | "red";

/** A KPI tile in the design's `.stat` style (icon chip + big value + label). */
export function StatCard({
  icon,
  tone = "teal",
  value,
  label,
}: {
  icon: ReactNode;
  tone?: StatTone;
  value: ReactNode;
  label: ReactNode;
}) {
  return (
    <div className="stat">
      <div className={cn("stat-ico", tone !== "teal" && tone)}>{icon}</div>
      <div className="stat-val">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
