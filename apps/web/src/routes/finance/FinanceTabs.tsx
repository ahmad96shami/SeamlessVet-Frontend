import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";

import { cn } from "@/lib/utils";

/**
 * Sub-nav for the finance surface (contracts · batches · entitlements). The partners tab is appended
 * in W8.7 behind the partnership solo-gate. Mirrors the POS/inventory tab pattern.
 */
const TABS = [
  { to: "/finance/contracts", labelKey: "finance.tabs.contracts" },
  { to: "/finance/batches", labelKey: "finance.tabs.batches" },
  { to: "/finance/entitlements", labelKey: "finance.tabs.entitlements" },
];

export function FinanceTabs() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap gap-1 border-b">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
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
