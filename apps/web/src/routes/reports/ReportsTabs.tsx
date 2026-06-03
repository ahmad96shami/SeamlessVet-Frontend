import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";

import { cn } from "@/lib/utils";

/**
 * Sub-nav for the reports surface. `end` only on the overview (index) tab so the others don't keep it
 * highlighted. Mirrors the finance/POS tab pattern; flex-wraps the full report set.
 */
const TABS = [
  { to: "/reports", labelKey: "reports.tabs.overview", end: true },
  { to: "/reports/doctor-income", labelKey: "reports.tabs.doctorIncome" },
  { to: "/reports/clinic-profits", labelKey: "reports.tabs.clinicProfits" },
  { to: "/reports/profit-per-batch", labelKey: "reports.tabs.profitPerBatch" },
  { to: "/reports/profit-and-loss", labelKey: "reports.tabs.profitAndLoss" },
  { to: "/reports/pharmacy-profit", labelKey: "reports.tabs.pharmacyProfit" },
  { to: "/reports/sales", labelKey: "reports.tabs.sales" },
  { to: "/reports/inventory-movement", labelKey: "reports.tabs.inventoryMovement" },
  { to: "/reports/field-visits", labelKey: "reports.tabs.fieldVisits" },
  { to: "/reports/farm-account", labelKey: "reports.tabs.farmAccount" },
  { to: "/reports/vaccinations", labelKey: "reports.tabs.vaccinations" },
  { to: "/reports/entitlements", labelKey: "reports.tabs.entitlements" },
];

export function ReportsTabs() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap gap-1 border-b">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) =>
            cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )
          }
        >
          {t(tab.labelKey)}
        </NavLink>
      ))}
    </div>
  );
}
