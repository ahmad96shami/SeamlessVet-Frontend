import type { ComponentType } from "react";

import { Icon } from "@/components/ui/icon";

export interface NavItem {
  to: string;
  labelKey: string;
  icon: ComponentType<{ className?: string }>;
  /** i18n key of the sidebar section this item is grouped under. */
  section: string;
  /** Roles that may see this item; undefined = all authenticated roles. */
  roles?: string[];
}

/** Sidebar section order (the design groups nav items under labelled sections). */
export const NAV_SECTION_ORDER = [
  "navSection.operations",
  "navSection.catalog",
  "navSection.system",
] as const;

export const NAV_ITEMS: NavItem[] = [
  { to: "/", labelKey: "nav.dashboard", icon: Icon.home, section: "navSection.operations" },
  {
    to: "/operations/customers",
    labelKey: "nav.customers",
    icon: Icon.briefcase,
    section: "navSection.operations",
    roles: ["admin", "accountant", "receptionist", "vet_clinic", "vet_both"],
  },
  {
    to: "/operations/visits",
    labelKey: "nav.visits",
    icon: Icon.stethoscope,
    section: "navSection.operations",
    roles: ["admin", "receptionist", "vet_clinic", "vet_both"],
  },
  {
    to: "/operations/appointments",
    labelKey: "nav.appointments",
    icon: Icon.cal,
    section: "navSection.operations",
    roles: ["admin", "receptionist", "vet_clinic", "vet_both"],
  },
  {
    to: "/pos",
    labelKey: "nav.pos",
    icon: Icon.receipt,
    section: "navSection.operations",
    roles: ["admin", "cashier"],
  },
  {
    to: "/inventory",
    labelKey: "nav.inventory",
    icon: Icon.truck,
    section: "navSection.operations",
    roles: ["admin", "inventory_staff"],
  },
  {
    to: "/admin/products",
    labelKey: "nav.products",
    icon: Icon.box,
    section: "navSection.catalog",
    roles: ["admin"],
  },
  {
    to: "/admin/services",
    labelKey: "nav.services",
    icon: Icon.pill,
    section: "navSection.catalog",
    roles: ["admin"],
  },
  {
    to: "/admin/registration-requests",
    labelKey: "nav.registrations",
    icon: Icon.inbox,
    section: "navSection.system",
    roles: ["admin"],
  },
  {
    to: "/admin/users",
    labelKey: "nav.users",
    icon: Icon.user,
    section: "navSection.system",
    roles: ["admin"],
  },
  {
    to: "/admin/settings",
    labelKey: "nav.settings",
    icon: Icon.settings,
    section: "navSection.system",
    roles: ["admin"],
  },
  {
    to: "/reports",
    labelKey: "nav.reports",
    icon: Icon.chart,
    section: "navSection.system",
    roles: ["admin", "accountant"],
  },
];

export function navForRole(role: string): NavItem[] {
  return NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role));
}
