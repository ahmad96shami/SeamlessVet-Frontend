import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";

import { cn } from "@/lib/utils";

/** Sub-nav for the users area: the staff roster, registration queue, and role/permission management. */
const TABS = [
  { to: "/admin/users", labelKey: "nav.users", end: true },
  { to: "/admin/registration-requests", labelKey: "nav.registrations", end: false },
  { to: "/admin/roles", labelKey: "nav.roles", end: false },
];

export function UsersTabs() {
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
