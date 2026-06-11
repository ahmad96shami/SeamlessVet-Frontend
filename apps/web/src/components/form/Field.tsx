import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
  // Zod's locale-mapped messages are full localized sentences (they contain spaces) and pass
  // through as-is; short single-token messages from schemas (e.g. "nonzero", "invalid_phone")
  // are localized via the `validation.*` catalog.
  const errorText =
    error && !/\s/.test(error) ? t(`validation.${error}`, { defaultValue: error }) : error;
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {errorText ? (
        <p className="text-sm text-destructive">{errorText}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
