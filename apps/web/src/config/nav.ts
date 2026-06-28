import type { ComponentType } from "react";
import { PermissionKey } from "@vet/shared";

import { Icon } from "@/components/ui/icon";

export interface NavItem {
  to: string;
  labelKey: string;
  icon: ComponentType<{ className?: string }>;
  /** i18n key of the sidebar section this item is grouped under. */
  section: string;
  /** Roles that may see this item; undefined = all authenticated roles. */
  roles?: string[];
  /**
   * If set, the item is ALSO shown to any user whose effective permissions include this key —
   * OR-ed with `roles`. This lets a per-user override surface a screen the user's role wouldn't
   * normally show (e.g. a receptionist granted `invoices.write` gets POS).
   */
  permission?: string;
}

/**
 * Sidebar section order. Sections render as plain dividers (no visible header) between groups,
 * so this list defines the seven separator-delimited groups of the rail, top to bottom.
 */
export const NAV_SECTION_ORDER = [
  "navSection.dashboard",
  "navSection.operations",
  "navSection.sales",
  "navSection.inventory",
  "navSection.contracts",
  "navSection.reports",
  "navSection.system",
] as const;

export const NAV_ITEMS: NavItem[] = [
  // — الرئيسية —
  { to: "/", labelKey: "nav.dashboard", icon: Icon.home, section: "navSection.dashboard" },

  // — العملاء / الزيارات / المواعيد —
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

  // — نقطة البيع / المنتجات / الخدمات / التطعيمات —
  {
    to: "/pos",
    labelKey: "nav.pos",
    icon: Icon.receipt,
    section: "navSection.sales",
    roles: ["admin", "cashier"],
    // Anyone allowed to issue invoices gets the register — including a receptionist (or other
    // role) granted invoices.write via a per-user override, not just the default admin/cashier.
    permission: PermissionKey.InvoicesWrite,
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
    to: "/vaccinations",
    labelKey: "nav.vaccinations",
    icon: Icon.syringe,
    section: "navSection.sales",
    roles: ["admin", "receptionist", "vet_clinic", "vet_field", "vet_both"],
  },

  // — المخزون / المورّدون / المشتريات / المصاريف التشغيلية —
  {
    to: "/inventory",
    labelKey: "nav.inventory",
    icon: Icon.truck,
    section: "navSection.inventory",
    roles: ["admin", "inventory_staff"],
  },
  {
    to: "/finance/suppliers",
    labelKey: "nav.suppliers",
    icon: Icon.truck,
    section: "navSection.inventory",
    roles: ["admin", "accountant"],
  },
  {
    to: "/finance/purchases",
    labelKey: "nav.purchases",
    icon: Icon.inbox,
    section: "navSection.inventory",
    roles: ["admin", "accountant"],
  },
  {
    to: "/finance/operating-expenses",
    labelKey: "nav.operatingExpenses",
    icon: Icon.receipt,
    section: "navSection.inventory",
    roles: ["admin", "accountant"],
    permission: PermissionKey.OperatingExpensesManage,
  },

  // — العقود —
  {
    to: "/finance/contracts",
    labelKey: "nav.contracts",
    icon: Icon.paper,
    section: "navSection.contracts",
    roles: ["admin", "accountant"],
  },

  // — التقارير —
  {
    to: "/reports",
    labelKey: "nav.reports",
    icon: Icon.chart,
    section: "navSection.reports",
    roles: ["admin", "accountant"],
  },
  {
    // Doctor self-service income — outside the reports.read gate (vets only; admins/accountants
    // get the full reports surface above).
    to: "/my-income",
    labelKey: "nav.myIncome",
    icon: Icon.chart,
    section: "navSection.reports",
    roles: ["vet_clinic", "vet_field", "vet_both"],
  },

  // — الأطباء الشركاء / الموظفون / المستخدمون / الإعدادات —
  {
    to: "/finance/doctor-partners",
    labelKey: "nav.doctorPartners",
    icon: Icon.stethoscope,
    section: "navSection.system",
    roles: ["admin", "accountant"],
  },
  {
    to: "/finance/employees",
    labelKey: "nav.employees",
    icon: Icon.user,
    section: "navSection.system",
    roles: ["admin", "accountant"],
  },
  {
    to: "/admin/users",
    labelKey: "nav.users",
    icon: Icon.user,
    section: "navSection.system",
    roles: ["admin"],
  },
  // Registration requests + roles are managed via tabs inside the Users page
  // (/admin/registration-requests, /admin/roles), not standalone sidebar items.
  {
    to: "/admin/settings",
    labelKey: "nav.settings",
    icon: Icon.settings,
    section: "navSection.system",
    roles: ["admin"],
  },
];

/**
 * Filter the nav for a user: an item shows when the user's `role` is allowed (or the item is
 * unrestricted) OR the user holds the item's `permission`. Passing the effective permission set
 * lets per-user grants reveal screens the role alone wouldn't.
 */
export function navForUser(role: string, permissions: readonly string[] = []): NavItem[] {
  return NAV_ITEMS.filter((item) => {
    const roleOk = !item.roles || item.roles.includes(role);
    const permOk = item.permission ? permissions.includes(item.permission) : false;
    return roleOk || permOk;
  });
}
