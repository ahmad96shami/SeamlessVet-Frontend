/**
 * Enums mirroring the server-canonical DB enumerations (SCHEMA.md § Enumerations).
 * The single source both apps + forms use. Each enum is a `const` object (named
 * members → wire value) plus a matching union type and a `_VALUES` array for dropdowns.
 *
 * Keep in lockstep with SCHEMA.md. Wire values are the snake_case strings the API expects.
 */

type EnumValues<T> = T[keyof T];
function values<T extends Record<string, string>>(e: T): readonly EnumValues<T>[] {
  return Object.values(e) as EnumValues<T>[];
}

// --- 1. Tenancy & Identity ---------------------------------------------------

export const EnvironmentMode = {
  Solo: "solo",
  Partnership: "partnership",
} as const;
export type EnvironmentMode = EnumValues<typeof EnvironmentMode>;
export const ENVIRONMENT_MODE_VALUES = values(EnvironmentMode);

export const RoleKey = {
  Admin: "admin",
  Accountant: "accountant",
  VetClinic: "vet_clinic",
  VetField: "vet_field",
  VetBoth: "vet_both",
  Receptionist: "receptionist",
  Cashier: "cashier",
  InventoryStaff: "inventory_staff",
} as const;
export type RoleKey = EnumValues<typeof RoleKey>;
export const ROLE_KEY_VALUES = values(RoleKey);

export const UserStatus = {
  Inactive: "inactive",
  Active: "active",
  Suspended: "suspended",
} as const;
export type UserStatus = EnumValues<typeof UserStatus>;
export const USER_STATUS_VALUES = values(UserStatus);

export const OverrideEffect = {
  Grant: "grant",
  Deny: "deny",
} as const;
export type OverrideEffect = EnumValues<typeof OverrideEffect>;
export const OVERRIDE_EFFECT_VALUES = values(OverrideEffect);

export const RequestStatus = {
  Pending: "pending",
  Approved: "approved",
  Rejected: "rejected",
} as const;
export type RequestStatus = EnumValues<typeof RequestStatus>;
export const REQUEST_STATUS_VALUES = values(RequestStatus);

/**
 * Canonical fine-grained permission keys (dot-notation), mirroring the backend `PermissionKey`
 * catalog (vet-backend `Domain/Entities/Permission.cs`). These aren't a DB enum — they're rows
 * in the `permissions` table — but they're a fixed, server-canonical set the admin
 * permission-override editor (web W1) offers. Keep in lockstep with the backend.
 */
export const PermissionKey = {
  UsersApprove: "users.approve",
  UsersManage: "users.manage",
  UsersPermissionsOverride: "users.permissions.override",
  SettingsWrite: "settings.write",
  CatalogWrite: "catalog.write",
  CustomersWrite: "customers.write",
  MedicalWrite: "medical.write",
  AppointmentsWrite: "appointments.write",
  ContractsWrite: "contracts.write",
  ContractsActivate: "contracts.activate",
  InvoicesWrite: "invoices.write",
  InvoicesRefund: "invoices.refund",
  InvoicesVoid: "invoices.void",
  InventoryRead: "inventory.read",
  InventoryAdjust: "inventory.adjust",
  EntitlementsApprove: "entitlements.approve",
  PartnershipManage: "partnership.manage",
  ReportsRead: "reports.read",
  SuppliersWrite: "suppliers.write",
  DoctorPartnersManage: "doctor_partners.manage",
  DoctorPartnersPay: "doctor_partners.pay",
  EmployeesManage: "employees.manage",
  EmployeesPay: "employees.pay",
  // Roles tab (custom roles + editing built-in role permissions) and operating expenses.
  RolesManage: "roles.manage",
  OperatingExpensesManage: "operating_expenses.manage",
} as const;
export type PermissionKey = EnumValues<typeof PermissionKey>;
export const PERMISSION_KEY_VALUES = values(PermissionKey);

/**
 * The standard permission set each role is seeded with (mirrors the backend
 * `DataSeeder.BuildRoleDefaults`). The admin permission-override editor reads this to show, per
 * permission, whether the user's role grants it by default — overrides layer on top. Keep in
 * lockstep with the backend; `admin` implicitly gets every permission.
 */
export const ROLE_DEFAULT_PERMISSIONS: Record<RoleKey, readonly PermissionKey[]> = {
  [RoleKey.Admin]: PERMISSION_KEY_VALUES,
  [RoleKey.Accountant]: [
    PermissionKey.InvoicesWrite,
    PermissionKey.InvoicesRefund,
    PermissionKey.InvoicesVoid,
    PermissionKey.ReportsRead,
    PermissionKey.SettingsWrite,
    PermissionKey.CatalogWrite,
    PermissionKey.CustomersWrite,
    PermissionKey.ContractsWrite,
    PermissionKey.ContractsActivate,
    PermissionKey.SuppliersWrite,
    PermissionKey.DoctorPartnersManage,
    PermissionKey.DoctorPartnersPay,
    PermissionKey.EmployeesManage,
    PermissionKey.EmployeesPay,
    PermissionKey.OperatingExpensesManage,
  ],
  [RoleKey.InventoryStaff]: [PermissionKey.InventoryRead, PermissionKey.InventoryAdjust, PermissionKey.CatalogWrite],
  [RoleKey.VetClinic]: [
    PermissionKey.CustomersWrite,
    PermissionKey.MedicalWrite,
    PermissionKey.AppointmentsWrite,
  ],
  [RoleKey.VetField]: [
    PermissionKey.CustomersWrite,
    PermissionKey.MedicalWrite,
    PermissionKey.AppointmentsWrite,
    PermissionKey.InvoicesWrite,
    PermissionKey.ContractsWrite,
  ],
  [RoleKey.VetBoth]: [
    PermissionKey.CustomersWrite,
    PermissionKey.MedicalWrite,
    PermissionKey.AppointmentsWrite,
    PermissionKey.InvoicesWrite,
    PermissionKey.ContractsWrite,
  ],
  [RoleKey.Receptionist]: [
    PermissionKey.CustomersWrite,
    PermissionKey.MedicalWrite,
    PermissionKey.AppointmentsWrite,
  ],
  [RoleKey.Cashier]: [PermissionKey.InvoicesWrite],
};

// --- 2. Customers & Pets -----------------------------------------------------

// Declaration order = dropdown order (CUSTOMER_TYPE_VALUES feeds the type selects as-is):
// منزل، زبون عيادة، مزرعة عامة، مزرعة أبقار، مزرعة دواجن.
export const CustomerType = {
  Home: "home",
  ClinicCustomer: "clinic_customer", // M15 — in-clinic account owner ("زبون عيادة")
  RegularFarm: "regular_farm",
  CattleFarm: "cattle_farm",
  PoultryFarm: "poultry_farm",
} as const;
export type CustomerType = EnumValues<typeof CustomerType>;
export const CUSTOMER_TYPE_VALUES = values(CustomerType);

// M15 — a customer owns 1–N farms (attached like pets).
export const FarmKind = {
  Poultry: "poultry",
  Cattle: "cattle",
  Mixed: "mixed",
  Other: "other",
} as const;
export type FarmKind = EnumValues<typeof FarmKind>;
export const FARM_KIND_VALUES = values(FarmKind);

export const PetSex = {
  Male: "male",
  Female: "female",
  Unknown: "unknown",
} as const;
export type PetSex = EnumValues<typeof PetSex>;
export const PET_SEX_VALUES = values(PetSex);

export const LedgerStatus = {
  Open: "open",
  HasDebt: "has_debt",
  Closed: "closed",
} as const;
export type LedgerStatus = EnumValues<typeof LedgerStatus>;
export const LEDGER_STATUS_VALUES = values(LedgerStatus);

export const LedgerEntryType = {
  Invoice: "invoice",
  ServiceFee: "service_fee",
  ExamFee: "exam_fee",
  ReceiptVoucher: "receipt_voucher",
  Adjustment: "adjustment",
  // M17 — in-clinic checkup fee (رسوم الكشف) + boarding charge (مبيت).
  CheckupFee: "checkup_fee",
  NightStay: "night_stay",
} as const;
export type LedgerEntryType = EnumValues<typeof LedgerEntryType>;
export const LEDGER_ENTRY_TYPE_VALUES = values(LedgerEntryType);

// --- 3. Catalog --------------------------------------------------------------

export const ProductCategory = {
  Medication: "medication",
  Product: "product",
  // M26 — vaccines are stock products (category `vaccine`): purchasable, FEFO-deducted on
  // administration, billed as a product line. Reverses the M22 vaccines-as-services model.
  Vaccine: "vaccine",
} as const;
export type ProductCategory = EnumValues<typeof ProductCategory>;
export const PRODUCT_CATEGORY_VALUES = values(ProductCategory);

// --- 4. Inventory ------------------------------------------------------------

export const StockLocation = {
  Warehouse: "warehouse",
  Field: "field",
} as const;
export type StockLocation = EnumValues<typeof StockLocation>;
export const STOCK_LOCATION_VALUES = values(StockLocation);

export const MovementType = {
  Receive: "receive",
  Adjust: "adjust",
  LoadToField: "load_to_field",
  UnloadFromField: "unload_from_field",
  SaleDeduct: "sale_deduct",
  ReturnAdd: "return_add",
  // M27 — internal use of an is_consumable product (gloves, syringes, …); a single negative leg.
  Consume: "consume",
} as const;
export type MovementType = EnumValues<typeof MovementType>;
export const MOVEMENT_TYPE_VALUES = values(MovementType);

// --- 5. Contracts & Batches --------------------------------------------------

export const ContractStatus = {
  Draft: "draft",
  Active: "active",
  Completed: "completed",
  Cancelled: "cancelled",
} as const;
export type ContractStatus = EnumValues<typeof ContractStatus>;
export const CONTRACT_STATUS_VALUES = values(ContractStatus);

export const FeeModel = {
  FixedAmount: "fixed_amount",
  PercentOfInvoice: "percent_of_invoice",
  PerBird: "per_bird",
  PerBatchFixed: "per_batch_fixed",
} as const;
export type FeeModel = EnumValues<typeof FeeModel>;
export const FEE_MODEL_VALUES = values(FeeModel);

export const EntitlementSystem = {
  DrugProfit: "drug_profit",
  DirectFee: "direct_fee",
} as const;
export type EntitlementSystem = EnumValues<typeof EntitlementSystem>;
export const ENTITLEMENT_SYSTEM_VALUES = values(EntitlementSystem);

export const BatchStatus = {
  Open: "open",
  Closed: "closed",
} as const;
export type BatchStatus = EnumValues<typeof BatchStatus>;
export const BATCH_STATUS_VALUES = values(BatchStatus);

// --- 6. Visits & Medical -----------------------------------------------------

export const VisitType = {
  InClinic: "in_clinic",
  Field: "field",
} as const;
export type VisitType = EnumValues<typeof VisitType>;
export const VISIT_TYPE_VALUES = values(VisitType);

export const VisitStatus = {
  Open: "open",
  InProgress: "in_progress",
  Completed: "completed",
  Cancelled: "cancelled",
} as const;
export type VisitStatus = EnumValues<typeof VisitStatus>;
export const VISIT_STATUS_VALUES = values(VisitStatus);

export const Severity = {
  Mild: "mild",
  Moderate: "moderate",
  Severe: "severe",
  Critical: "critical",
} as const;
export type Severity = EnumValues<typeof Severity>;
export const SEVERITY_VALUES = values(Severity);

// M17 — boarding (مبيت) care type, each with its own per-night cost.
export const CareType = {
  Medical: "medical",
  Icu: "icu",
  Hotel: "hotel",
} as const;
export type CareType = EnumValues<typeof CareType>;
export const CARE_TYPE_VALUES = values(CareType);

export const DispenseType = {
  AdministeredInClinic: "administered_in_clinic",
  DispensedToOwner: "dispensed_to_owner",
} as const;
export type DispenseType = EnumValues<typeof DispenseType>;
export const DISPENSE_TYPE_VALUES = values(DispenseType);

export const AttachmentType = {
  Photo: "photo",
  Pdf: "pdf",
} as const;
export type AttachmentType = EnumValues<typeof AttachmentType>;
export const ATTACHMENT_TYPE_VALUES = values(AttachmentType);

export const UploadStatus = {
  Pending: "pending",
  Uploaded: "uploaded",
  Failed: "failed",
} as const;
export type UploadStatus = EnumValues<typeof UploadStatus>;
export const UPLOAD_STATUS_VALUES = values(UploadStatus);

// --- 7. Appointments ---------------------------------------------------------

export const AppointmentStatus = {
  Scheduled: "scheduled",
  Confirmed: "confirmed",
  Attended: "attended",
  NoShow: "no_show",
  Cancelled: "cancelled",
} as const;
export type AppointmentStatus = EnumValues<typeof AppointmentStatus>;
export const APPOINTMENT_STATUS_VALUES = values(AppointmentStatus);

// --- 8. Financial ------------------------------------------------------------

export const InvoiceType = {
  Pos: "pos",
  Field: "field",
  ExamFee: "exam_fee",
} as const;
export type InvoiceType = EnumValues<typeof InvoiceType>;
export const INVOICE_TYPE_VALUES = values(InvoiceType);

export const InvoiceStatus = {
  Issued: "issued",
  Flagged: "flagged",
  Void: "void",
} as const;
export type InvoiceStatus = EnumValues<typeof InvoiceStatus>;
export const INVOICE_STATUS_VALUES = values(InvoiceStatus);

export const PaymentMethod = {
  Cash: "cash",
  Card: "card",
  BankTransfer: "bank_transfer",
  Credit: "credit",
  // M19 — settles immediately like cash; carries optional cheque reference metadata.
  Cheque: "cheque",
} as const;
export type PaymentMethod = EnumValues<typeof PaymentMethod>;
export const PAYMENT_METHOD_VALUES = values(PaymentMethod);

/** Methods that settle on the spot (everything except `credit`). M19 added `cheque`. */
export const IMMEDIATE_PAYMENT_METHODS = [
  PaymentMethod.Cash,
  PaymentMethod.Card,
  PaymentMethod.BankTransfer,
  PaymentMethod.Cheque,
] as const;

// M31 — the kind of an employee payment selects its HR-ledger effect (a salary_payment may carry a
// loanRepaymentAmount to repay a loan out of that salary — the future-salary-deduction pairing).
export const EmployeePaymentKind = {
  /** Salary paid to the employee (optionally with a loan deduction). */
  SalaryPayment: "salary_payment",
  /** An advance/loan given to the employee. */
  Loan: "loan",
  /** A direct cash loan repayment by the employee. */
  LoanRepayment: "loan_repayment",
  /** خصم — a deduction/penalty withheld from the employee; debits (reduces) the payable. */
  Deduction: "deduction",
} as const;
export type EmployeePaymentKind = EnumValues<typeof EmployeePaymentKind>;
export const EMPLOYEE_PAYMENT_KIND_VALUES = values(EmployeePaymentKind);

// M30 removed the doctor-entitlement approve/pay lifecycle — an entitlement is now an immutable accrual
// credited to the doctor's partner ledger on batch settle, so there is no EntitlementStatus enum.

// Operating expenses (water, electricity, rent, …) — general costs that reduce net profit.
// Declaration order = dropdown order.
export const OperatingExpenseCategory = {
  Water: "water",
  Electricity: "electricity",
  Rent: "rent",
  Internet: "internet",
  Maintenance: "maintenance",
  Other: "other",
} as const;
export type OperatingExpenseCategory = EnumValues<typeof OperatingExpenseCategory>;
export const OPERATING_EXPENSE_CATEGORY_VALUES = values(OperatingExpenseCategory);

// --- 9. System ---------------------------------------------------------------

export const NotificationType = {
  AppointmentReminder: "appointment_reminder",
  FollowUpDue: "follow_up_due",
  VaccinationDue: "vaccination_due",
  MedicationDue: "medication_due",
  LowStock: "low_stock",
  ExpiryWarning: "expiry_warning",
  RegistrationRequest: "registration_request",
  NegativeStock: "negative_stock",
  AccountReadyForSettlement: "account_ready_for_settlement",
  EntitlementApproved: "entitlement_approved",
  ReportDelivery: "report_delivery",
} as const;
export type NotificationType = EnumValues<typeof NotificationType>;
export const NOTIFICATION_TYPE_VALUES = values(NotificationType);
