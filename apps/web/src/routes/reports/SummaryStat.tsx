import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** A compact label-over-value summary tile (report totals, P&L lines, batch breakdown). */
export function SummaryStat({
  label,
  value,
  tone,
  hint,
}: {
  label: ReactNode;
  value: ReactNode;
  tone?: "teal" | "navy" | "amber" | "green" | "red";
  hint?: ReactNode;
}) {
  const color =
    tone === "teal"
      ? "var(--teal-700)"
      : tone === "amber"
        ? "#8b6500"
        : tone === "green"
          ? "#19694e"
          : tone === "red"
            ? "var(--red)"
            : tone === "navy"
              ? "var(--navy-900)"
              : undefined;
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-bold tabular-nums" style={color ? { color } : undefined}>
        {value}
      </div>
      {hint ? <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div> : null}
    </div>
  );
}

/** Responsive grid wrapper for a row of {@link SummaryStat} tiles. */
export function SummaryGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid gap-3 sm:grid-cols-2 lg:grid-cols-4", className)}>{children}</div>;
}
