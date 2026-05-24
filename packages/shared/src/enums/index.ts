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
  InventoryAdjust: "inventory.adjust",
  EntitlementsApprove: "entitlements.approve",
  PartnershipManage: "partnership.manage",
  ReportsRead: "reports.read",
} as const;
export type PermissionKey = EnumValues<typeof PermissionKey>;
export const PERMISSION_KEY_VALUES = values(PermissionKey);

// --- 2. Customers & Pets -----------------------------------------------------

export const CustomerType = {
  RegularFarm: "regular_farm",
  Home: "home",
  CattleFarm: "cattle_farm",
  PoultryFarm: "poultry_farm",
} as const;
export type CustomerType = EnumValues<typeof CustomerType>;
export const CUSTOMER_TYPE_VALUES = values(CustomerType);

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
} as const;
export type LedgerEntryType = EnumValues<typeof LedgerEntryType>;
export const LEDGER_ENTRY_TYPE_VALUES = values(LedgerEntryType);

// --- 3. Catalog --------------------------------------------------------------

export const ProductCategory = {
  Medication: "medication",
  Product: "product",
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
} as const;
export type PaymentMethod = EnumValues<typeof PaymentMethod>;
export const PAYMENT_METHOD_VALUES = values(PaymentMethod);

export const EntitlementStatus = {
  Pending: "pending",
  Approved: "approved",
  Paid: "paid",
} as const;
export type EntitlementStatus = EnumValues<typeof EntitlementStatus>;
export const ENTITLEMENT_STATUS_VALUES = values(EntitlementStatus);

// --- 9. System ---------------------------------------------------------------

export const NotificationType = {
  AppointmentReminder: "appointment_reminder",
  FollowUpDue: "follow_up_due",
  VaccinationDue: "vaccination_due",
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
