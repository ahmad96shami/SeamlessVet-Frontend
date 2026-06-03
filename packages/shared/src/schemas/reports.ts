import { z } from "zod";

// ---- Reports (M12, PRD §7.9) ----------------------------------------------
//
// All report endpoints live under `/reports`, are env-scoped + offset/cursor-paged server-side, and
// gated on `reports.read` (except `/reports/my-income`, which is auth-only + self-scoped to the
// caller). Each takes an optional `?format=xlsx|pdf`; absent it returns the typed JSON DTO below,
// otherwise the server streams an Arabic/RTL Excel or PDF file (handled by `downloadReport`, not these
// schemas). These are **read-only** — there are no report writes. Schemas mirror the backend
// `VetSystem.Application.Reports.Contracts.*` records one-to-one.

/** A partner's slice of a distributed clinic profit (M10 `ProfitAllocation`). */
export const ProfitAllocationSchema = z.object({
  partnerId: z.string(),
  displayName: z.string(),
  sharePercent: z.number(),
  amount: z.number(),
});
export type ProfitAllocation = z.infer<typeof ProfitAllocationSchema>;

// ---- Doctor income (task 2) + my-income (task 5) --------------------------

export const DoctorIncomeRowSchema = z.object({
  doctorId: z.string(),
  doctorName: z.string(),
  visitCount: z.number(),
  totalRevenue: z.number(),
  calculatedShare: z.number(),
});
export type DoctorIncomeRow = z.infer<typeof DoctorIncomeRowSchema>;

/** `Total*` fields summarise the whole filtered set (paging-independent), so KPIs stay correct. */
export const DoctorIncomeReportSchema = z.object({
  from: z.string().nullish(),
  to: z.string().nullish(),
  visitType: z.string().nullish(),
  doctorCount: z.number(),
  totalVisitCount: z.number(),
  totalRevenue: z.number(),
  totalCalculatedShare: z.number(),
  rows: z.array(DoctorIncomeRowSchema),
});
export type DoctorIncomeReport = z.infer<typeof DoctorIncomeReportSchema>;

export interface DoctorIncomeParams {
  from?: string;
  to?: string;
  doctorId?: string;
  visitType?: string;
  skip?: number;
  take?: number;
}

/** my-income drops `doctorId` (fixed to the caller server-side). */
export type MyIncomeParams = Omit<DoctorIncomeParams, "doctorId">;

// ---- Clinic profits (task 3) ----------------------------------------------

/**
 * `netProfit` is the clinic **gross margin** (ex-tax revenue − COGS); the partner split (M10) divides
 * that net. `doctorShares` is a separate memo line — **not** subtracted from `netProfit`.
 * `retainedByClinic` is the portion the partners' shares don't cover (Σ shares < 100%).
 */
export const ClinicProfitsReportSchema = z.object({
  from: z.string().nullish(),
  to: z.string().nullish(),
  asOf: z.string(),
  revenue: z.number(),
  cogs: z.number(),
  netProfit: z.number(),
  doctorShares: z.number(),
  distributedToPartners: z.number(),
  retainedByClinic: z.number(),
  partnerAllocations: z.array(ProfitAllocationSchema),
});
export type ClinicProfitsReport = z.infer<typeof ClinicProfitsReportSchema>;

export interface ClinicProfitsParams {
  from?: string;
  to?: string;
}

// ---- Profit per batch (task 3) --------------------------------------------

/** Cost/revenue + doctor/clinic share are taken verbatim from the M9 engine (cent-perfect parity). */
export const ProfitPerBatchReportSchema = z.object({
  batchId: z.string(),
  customerId: z.string(),
  doctorId: z.string(),
  entitlementSystem: z.string(),
  entitlementEnabled: z.boolean(),
  revenue: z.number(),
  drugCost: z.number(),
  drugProfit: z.number(),
  examFee: z.number(),
  doctorShare: z.number(),
  ceilingApplied: z.number().nullish(),
  clinicShare: z.number(),
  asOf: z.string(),
  distributedToPartners: z.number(),
  retainedByClinic: z.number(),
  partnerAllocations: z.array(ProfitAllocationSchema),
});
export type ProfitPerBatchReport = z.infer<typeof ProfitPerBatchReportSchema>;

// ---- Profit & loss (task 3) -----------------------------------------------

/**
 * `grossProfit` = ex-tax `revenue` − `cogs`. `taxCollected` (a remitted liability) and `doctorShares`
 * (a separate payout) are memo lines, not netted in. No expense ledger exists ⇒ this is the fullest
 * P&L the schema supports.
 */
export const ProfitAndLossReportSchema = z.object({
  from: z.string().nullish(),
  to: z.string().nullish(),
  revenue: z.number(),
  taxCollected: z.number(),
  cogs: z.number(),
  grossProfit: z.number(),
  doctorShares: z.number(),
});
export type ProfitAndLossReport = z.infer<typeof ProfitAndLossReportSchema>;

export interface PeriodParams {
  from?: string;
  to?: string;
}

// ---- Sales (task 3) -------------------------------------------------------

export const SalesByMethodSchema = z.object({
  method: z.string(),
  amount: z.number(),
  paymentCount: z.number(),
});
export type SalesByMethod = z.infer<typeof SalesByMethodSchema>;

/** Only effective (non-void) invoices count; a `credit` row is the on-account portion. */
export const SalesReportSchema = z.object({
  from: z.string().nullish(),
  to: z.string().nullish(),
  cashierId: z.string().nullish(),
  total: z.number(),
  invoiceCount: z.number(),
  byMethod: z.array(SalesByMethodSchema),
});
export type SalesReport = z.infer<typeof SalesReportSchema>;

export interface SalesParams {
  from?: string;
  to?: string;
  cashierId?: string;
}

// ---- Inventory movement (task 4) ------------------------------------------

/**
 * `inflows`/`outflows` are the period's signed movement deltas attributed to this location (a delta
 * lands on its `to` location when positive, its `from` location when negative). `netChange` =
 * inflows − outflows; `balance` is the current on-hand quantity (over an all-time window it equals
 * `netChange` — the reconciliation guarantee).
 */
export const InventoryMovementRowSchema = z.object({
  locationType: z.string(),
  locationId: z.string(),
  productId: z.string(),
  inflows: z.number(),
  outflows: z.number(),
  netChange: z.number(),
  balance: z.number(),
});
export type InventoryMovementRow = z.infer<typeof InventoryMovementRowSchema>;

export const InventoryMovementReportSchema = z.object({
  from: z.string().nullish(),
  to: z.string().nullish(),
  productId: z.string().nullish(),
  locationType: z.string().nullish(),
  locationId: z.string().nullish(),
  totalCount: z.number(),
  rows: z.array(InventoryMovementRowSchema),
});
export type InventoryMovementReport = z.infer<typeof InventoryMovementReportSchema>;

export interface InventoryMovementParams {
  from?: string;
  to?: string;
  productId?: string;
  locationType?: string;
  locationId?: string;
  skip?: number;
  take?: number;
}

// ---- Field-doctor visits (task 4) — cursor-paged --------------------------

export const FieldVisitServiceLineSchema = z.object({
  serviceId: z.string().nullish(),
  serviceName: z.string().nullish(),
  price: z.number(),
});

export const FieldVisitMedicationLineSchema = z.object({
  productId: z.string(),
  productName: z.string().nullish(),
  dosage: z.string().nullish(),
  quantity: z.number().nullish(),
  dispenseType: z.string(),
});

export const FieldVisitRowSchema = z.object({
  visitId: z.string(),
  visitNumber: z.string().nullish(),
  doctorId: z.string(),
  customerId: z.string(),
  petId: z.string().nullish(),
  status: z.string(),
  startedAt: z.string().nullish(),
  endedAt: z.string().nullish(),
  services: z.array(FieldVisitServiceLineSchema),
  medications: z.array(FieldVisitMedicationLineSchema),
});
export type FieldVisitRow = z.infer<typeof FieldVisitRowSchema>;

/** Feed-like log → **cursor-paged**: pass `nextCursor` back as `?cursor=` (null on the last page). */
export const FieldDoctorVisitsReportSchema = z.object({
  from: z.string().nullish(),
  to: z.string().nullish(),
  doctorId: z.string().nullish(),
  totalCount: z.number(),
  rows: z.array(FieldVisitRowSchema),
  nextCursor: z.string().nullish(),
});
export type FieldDoctorVisitsReport = z.infer<typeof FieldDoctorVisitsReportSchema>;

export interface FieldDoctorVisitsParams {
  from?: string;
  to?: string;
  doctorId?: string;
  cursor?: string;
  limit?: number;
}

// ---- Upcoming vaccinations (task 4) ---------------------------------------

export const UpcomingVaccinationRowSchema = z.object({
  id: z.string(),
  petId: z.string().nullish(),
  customerId: z.string().nullish(),
  visitId: z.string().nullish(),
  vaccineType: z.string(),
  dateGiven: z.string(),
  nextDueDate: z.string().nullish(),
});
export type UpcomingVaccinationRow = z.infer<typeof UpcomingVaccinationRowSchema>;

export const UpcomingVaccinationsReportSchema = z.object({
  from: z.string().nullish(),
  to: z.string().nullish(),
  customerId: z.string().nullish(),
  totalCount: z.number(),
  rows: z.array(UpcomingVaccinationRowSchema),
});
export type UpcomingVaccinationsReport = z.infer<typeof UpcomingVaccinationsReportSchema>;

export interface UpcomingVaccinationsParams {
  from?: string;
  to?: string;
  customerId?: string;
  skip?: number;
  take?: number;
}

// ---- Pharmacy profit (M20) ------------------------------------------------

/** One product's row in the pharmacy-profit report: the period totals for that product. */
export const PharmacyProfitRowSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  quantitySold: z.number(),
  revenue: z.number(),
  cost: z.number(),
  profit: z.number(),
});
export type PharmacyProfitRow = z.infer<typeof PharmacyProfitRowSchema>;

/**
 * Drug/product gross margin over the window's effective (non-void) invoices: Σ product-line revenue −
 * Σ cost_price×qty, restricted to invoice_items that carry a `productId` (service lines excluded).
 * `cost` reconciles to the clinic-profits `cogs` on the same window. Rows (offset-paged) break the
 * margin down per product; the summary spans the whole window.
 */
export const PharmacyProfitReportSchema = z.object({
  from: z.string().nullish(),
  to: z.string().nullish(),
  revenue: z.number(),
  cost: z.number(),
  profit: z.number(),
  totalCount: z.number(),
  rows: z.array(PharmacyProfitRowSchema),
});
export type PharmacyProfitReport = z.infer<typeof PharmacyProfitReportSchema>;

export interface PharmacyProfitParams {
  from?: string;
  to?: string;
  skip?: number;
  take?: number;
}

// ---- Visit profit: in-clinic / field (M20) --------------------------------

/** One visit's row in a visit-profit report: the visit's revenue, COGS and margin. */
export const VisitProfitRowSchema = z.object({
  visitId: z.string(),
  visitNumber: z.string().nullish(),
  customerId: z.string(),
  farmId: z.string().nullish(),
  revenue: z.number(),
  cogs: z.number(),
  profit: z.number(),
});
export type VisitProfitRow = z.infer<typeof VisitProfitRowSchema>;

/**
 * Gross margin of the invoices attributed to a visit, grouped by visit. `visitType` is the slice
 * (`in_clinic` | `field`); `scope` optionally narrows by `Visit.farmId` (`farm` | `clinic` | absent =
 * both). Per visit, `revenue` is the ex-tax total of its effective invoices and `cogs` the cost over
 * their product lines — so the in-clinic and field reports together reconcile to the clinic-profits net
 * once walk-ins (no visit) are set aside. The summary spans the whole filtered set; `rows` are paged.
 */
export const VisitProfitReportSchema = z.object({
  from: z.string().nullish(),
  to: z.string().nullish(),
  visitType: z.string(),
  scope: z.string().nullish(),
  revenue: z.number(),
  cogs: z.number(),
  profit: z.number(),
  visitCount: z.number(),
  rows: z.array(VisitProfitRowSchema),
});
export type VisitProfitReport = z.infer<typeof VisitProfitReportSchema>;

/** The farm/clinic slicer on the visit-profit reports. Omit for both. */
export const VISIT_PROFIT_SCOPES = ["farm", "clinic"] as const;
export type VisitProfitScope = (typeof VISIT_PROFIT_SCOPES)[number];

export interface VisitProfitParams {
  from?: string;
  to?: string;
  scope?: VisitProfitScope;
  skip?: number;
  take?: number;
}

// ---- KPI summary (task 1) -------------------------------------------------

/** Snapshot as of `asOf` (UTC day): the four admin-dashboard headline figures. */
export const KpiSummaryReportSchema = z.object({
  asOf: z.string(),
  visitsToday: z.number(),
  revenueThisMonth: z.number(),
  pendingEntitlements: z.number(),
  lowStockItems: z.number(),
});
export type KpiSummaryReport = z.infer<typeof KpiSummaryReportSchema>;

// ---- Export ----------------------------------------------------------------

/** The export formats every report endpoint accepts via `?format=`. JSON is the default (no param). */
export const REPORT_EXPORT_FORMATS = ["xlsx", "pdf"] as const;
export type ReportExportFormat = (typeof REPORT_EXPORT_FORMATS)[number];
