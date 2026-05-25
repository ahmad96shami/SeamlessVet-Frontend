import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";

import { cn } from "@/lib/utils";

/** Sub-nav for the POS surface. `end` on the register tab so it isn't active on /pos/invoices. */
const TABS = [
  { to: "/pos", labelKey: "pos.tabs.register", end: true },
  { to: "/pos/invoices", labelKey: "pos.tabs.invoices", end: false },
];

export function PosTabs() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-none gap-1 border-b">
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
