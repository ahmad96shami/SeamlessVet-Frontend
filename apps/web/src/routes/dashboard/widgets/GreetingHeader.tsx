import { formatDate } from "@vet/shared";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

function timeOfDayKey(): "morning" | "afternoon" | "evening" {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}

/** The dashboard header — localized greeting + today's full date + an optional actions slot. */
export function GreetingHeader({ subtitle, actions }: { subtitle?: ReactNode; actions?: ReactNode }) {
  const { t, i18n } = useTranslation();
  const greeting = t(`dashboard.greeting.${timeOfDayKey()}`);
  const today = formatDate(new Date(), i18n.language, "EEEE · d MMMM yyyy");

  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-[var(--fg-strong)]">{greeting}</h1>
        <p className="mt-1 text-sm text-[var(--ink-500)]">
          {today}
          {subtitle ? <> · {subtitle}</> : null}
        </p>
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
