import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { DatePicker } from "@/components/ui/datepicker";
import { cn } from "@/lib/utils";
import { PERIOD_PRESETS, type PeriodPreset, type PeriodValue } from "@/routes/reports/period";

/**
 * Shared report filter bar: period presets (+ a custom from/to range) on the trailing edge, an
 * optional `filters` slot (doctor/customer/…) on the leading edge, and an `actions` slot for the
 * export buttons. Reused by every report screen so the period UX is identical everywhere.
 */
export function ReportFilterBar({
  value,
  onChange,
  filters,
  actions,
}: {
  value: PeriodValue;
  onChange: (next: PeriodValue) => void;
  filters?: ReactNode;
  actions?: ReactNode;
}) {
  const { t } = useTranslation();
  const setPreset = (preset: PeriodPreset) => onChange({ ...value, preset });

  return (
    <div className="flex flex-wrap items-center gap-2">
      {filters}
      <span className="flex-1" />
      {value.preset === "custom" ? (
        <div className="flex items-center gap-1">
          <DatePicker
            containerClassName="w-40"
            aria-label={t("reports.period.from")}
            value={value.from}
            onChange={(e) => onChange({ ...value, from: e.target.value })}
          />
          <span className="text-muted-foreground">—</span>
          <DatePicker
            containerClassName="w-40"
            aria-label={t("reports.period.to")}
            value={value.to}
            onChange={(e) => onChange({ ...value, to: e.target.value })}
          />
        </div>
      ) : null}
      {PERIOD_PRESETS.map((p) => (
        <button
          key={p}
          type="button"
          className={cn("chip", value.preset === p && "active")}
          onClick={() => setPreset(p)}
        >
          {t(`reports.period.${p}`)}
        </button>
      ))}
      <button
        type="button"
        className={cn("chip", value.preset === "custom" && "active")}
        onClick={() => setPreset("custom")}
      >
        {t("reports.period.custom")}
      </button>
      {actions}
    </div>
  );
}
