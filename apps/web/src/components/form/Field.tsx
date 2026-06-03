import type { ReactNode } from "react";

import { Label } from "@/components/ui/label";

/** Label + control + inline error/hint — the shared form row used by every screen. */
export function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  /** Muted helper text shown below the control (suppressed when an error is present). */
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
