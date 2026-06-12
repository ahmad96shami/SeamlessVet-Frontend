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
  "navSection.dashboard",
  "navSection.operations",
  "navSection.sales",
  "navSection.finance",
  "navSection.system",
] as const;

export const NAV_ITEMS: NavItem[] = [
  { to: "/", labelKey: "nav.dashboard", icon: Icon.home, section: "navSection.dashboard" },
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
    icon: Icon.clock,
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
    to: "/vaccinations",
    labelKey: "nav.vaccinations",
    icon: Icon.syringe,
    section: "navSection.operations",
    roles: ["admin", "receptionist", "vet_clinic", "vet_field", "vet_both"],
  },
  {
    to: "/pos",
    labelKey: "nav.pos",
    icon: Icon.receipt,
    section: "navSection.sales",
    roles: ["admin", "cashier"],
  },
  {
    to: "/inventory",
    labelKey: "nav.inventory",
    icon: Icon.truck,
    section: "navSection.sales",
    roles: ["admin", "inventory_staff"],
  },
  {
    to: "/admin/products",
    labelKey: "nav.products",
    icon: Icon.box,
    section: "navSection.sales",
    roles: ["admin"],
  },
  {
    to: "/admin/services",
    labelKey: "nav.services",
    icon: Icon.stethoscope,
    section: "navSection.sales",
    roles: ["admin"],
  },
  {
    to: "/finance/contracts",
    labelKey: "nav.contracts",
    icon: Icon.paper,
    section: "navSection.finance",
    roles: ["admin", "accountant"],
  },
  {
    to: "/finance/suppliers",
    labelKey: "nav.suppliers",
    icon: Icon.truck,
    section: "navSection.finance",
    roles: ["admin", "accountant"],
  },
  {
    to: "/finance/doctor-partners",
    labelKey: "nav.doctorPartners",
    icon: Icon.stethoscope,
    section: "navSection.finance",
    roles: ["admin", "accountant"],
  },
  {
    to: "/finance/purchases",
    labelKey: "nav.purchases",
    icon: Icon.inbox,
    section: "navSection.finance",
    roles: ["admin", "accountant"],
  },
  {
    to: "/finance/employees",
    labelKey: "nav.employees",
    icon: Icon.user,
    section: "navSection.finance",
    roles: ["admin", "accountant"],
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
    section: "navSection.finance",
    roles: ["admin", "accountant"],
  },
  {
    // Doctor self-service income — outside the reports.read gate (vets only; admins/accountants
    // get the full reports surface above).
    to: "/my-income",
    labelKey: "nav.myIncome",
    icon: Icon.chart,
    section: "navSection.operations",
    roles: ["vet_clinic", "vet_field", "vet_both"],
  },
];

export function navForRole(role: string): NavItem[] {
  return NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role));
}
