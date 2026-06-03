import { useTranslation } from "react-i18next";
import { Outlet } from "react-router-dom";

import { VaccinationsTabs } from "@/routes/vaccinations/VaccinationsTabs";

/**
 * Standalone vaccination surface (W13). A page header + the records/calendar sub-nav over the active
 * tab. Distinct from the in-visit vaccinations tab (W4) and the admin-gated upcoming report (W9).
 */
export function VaccinationsLayout() {
  const { t } = useTranslation();
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t("vaccinations.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("vaccinations.description")}</p>
      </div>
      <VaccinationsTabs />
      <Outlet />
    </div>
  );
}
