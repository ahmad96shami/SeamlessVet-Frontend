import type { ComponentType } from "react";
import {
  BarChart3,
  LayoutDashboard,
  Settings,
  ShoppingCart,
  Stethoscope,
  UserCheck,
  UserCog,
  Users,
} from "lucide-react";

export interface NavItem {
  to: string;
  labelKey: string;
  icon: ComponentType<{ className?: string }>;
  /** Roles that may see this item; undefined = all authenticated roles. */
  roles?: string[];
}

export const NAV_ITEMS: NavItem[] = [
  { to: "/", labelKey: "nav.dashboard", icon: LayoutDashboard },
  {
    to: "/operations/customers",
    labelKey: "nav.customers",
    icon: Users,
    roles: ["admin", "accountant", "receptionist", "vet_clinic", "vet_both"],
  },
  {
    to: "/operations/visits",
    labelKey: "nav.visits",
    icon: Stethoscope,
    roles: ["admin", "receptionist", "vet_clinic", "vet_both"],
  },
  { to: "/pos", labelKey: "nav.pos", icon: ShoppingCart, roles: ["admin", "cashier"] },
  {
    to: "/admin/registration-requests",
    labelKey: "nav.registrations",
    icon: UserCheck,
    roles: ["admin"],
  },
  { to: "/admin/users", labelKey: "nav.users", icon: UserCog, roles: ["admin"] },
  { to: "/admin/settings", labelKey: "nav.settings", icon: Settings, roles: ["admin"] },
  { to: "/reports", labelKey: "nav.reports", icon: BarChart3, roles: ["admin", "accountant"] },
];

export function navForRole(role: string): NavItem[] {
  return NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role));
}
