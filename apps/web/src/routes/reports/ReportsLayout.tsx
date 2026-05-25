import { Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { ReportsTabs } from "./ReportsTabs";

/** Reports surface shell: the page title + report sub-nav over the active report screen. */
export function ReportsLayout() {
  const { t } = useTranslation();
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t("reports.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("reports.subtitle")}</p>
      </div>
      <ReportsTabs />
      <Outlet />
    </div>
  );
}
