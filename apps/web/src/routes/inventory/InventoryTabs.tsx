import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";

import { cn } from "@/lib/utils";

/** Sub-nav for the inventory section. `end` on the index tab so it isn't active on child routes. */
const TABS = [
  { to: "/inventory", labelKey: "inventory.tab.stock", end: true },
  { to: "/inventory/movements", labelKey: "inventory.tab.movements", end: false },
];

export function InventoryTabs() {
  const { t } = useTranslation();
  return (
    <div className="flex gap-1 border-b">
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
