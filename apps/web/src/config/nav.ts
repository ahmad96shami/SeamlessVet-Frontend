import type { ComponentType } from "react";

import { Icon } from "@/components/ui/icon";

export interface NavItem {
  to: string;
  labelKey: string;
  icon: ComponentType<{ className?: string }>;
  /** Roles that may see this item; undefined = all authenticated roles. */
  roles?: string[];
}

export const NAV_ITEMS: NavItem[] = [
  { to: "/", labelKey: "nav.dashboard", icon: Icon.home },
  {
    to: "/operations/customers",
    labelKey: "nav.customers",
    icon: Icon.briefcase,
    roles: ["admin", "accountant", "receptionist", "vet_clinic", "vet_both"],
  },
  {
    to: "/operations/visits",
    labelKey: "nav.visits",
    icon: Icon.stethoscope,
    roles: ["admin", "receptionist", "vet_clinic", "vet_both"],
  },
  { to: "/pos", labelKey: "nav.pos", icon: Icon.receipt, roles: ["admin", "cashier"] },
  {
    to: "/admin/registration-requests",
    labelKey: "nav.registrations",
    icon: Icon.inbox,
    roles: ["admin"],
  },
  { to: "/admin/users", labelKey: "nav.users", icon: Icon.user, roles: ["admin"] },
  { to: "/admin/products", labelKey: "nav.products", icon: Icon.box, roles: ["admin"] },
  { to: "/admin/services", labelKey: "nav.services", icon: Icon.pill, roles: ["admin"] },
  { to: "/admin/settings", labelKey: "nav.settings", icon: Icon.settings, roles: ["admin"] },
  { to: "/reports", labelKey: "nav.reports", icon: Icon.chart, roles: ["admin", "accountant"] },
];

export function navForRole(role: string): NavItem[] {
  return NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role));
}
