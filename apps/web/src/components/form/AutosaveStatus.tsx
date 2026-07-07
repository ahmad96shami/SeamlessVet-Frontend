import { useTranslation } from "react-i18next";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

/**
 * Inline autosave feedback shown where a section's save button used to be. Reflects the section
 * PATCH mutation: a steady "saved automatically" hint at rest, a spinner while a save is in flight,
 * and a muted error if the last save failed (the next edit retries).
 */
export function AutosaveStatus({
  pending,
  error = false,
  className,
}: {
  pending: boolean;
  error?: boolean;
  className?: string;
}) {
  const { t } = useTranslation();

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-center justify-end gap-1.5 text-xs",
        error && !pending ? "text-destructive" : "text-muted-foreground",
        className,
      )}
    >
      {pending ? (
        <>
          <Icon.spinner className="size-3.5 animate-spin" />
          {t("autosave.saving")}
        </>
      ) : error ? (
        <>
          <Icon.warn className="size-3.5" />
          {t("autosave.error")}
        </>
      ) : (
        <>
          <Icon.check className="size-3.5" />
          {t("autosave.hint")}
        </>
      )}
    </div>
  );
}
