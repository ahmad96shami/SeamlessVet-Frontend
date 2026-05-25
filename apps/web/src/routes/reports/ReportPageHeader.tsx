import { useTranslation } from "react-i18next";

/** Per-report sub-heading (the global "Reports" title + tabs live in the layout above). */
export function ReportPageHeader({ titleKey, subtitleKey }: { titleKey: string; subtitleKey: string }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-1">
      <h2 className="text-lg font-semibold text-navy-900">{t(titleKey)}</h2>
      <p className="text-sm text-muted-foreground">{t(subtitleKey)}</p>
    </div>
  );
}
