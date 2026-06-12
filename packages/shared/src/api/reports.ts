import type { AxiosInstance } from "axios";

import {
  DoctorEntitlementResponseSchema,
  type DoctorEntitlementResponse,
  type EntitlementListParams,
} from "../schemas/entitlements";
import { StatementResponseSchema, type StatementResponse } from "../schemas/ledgers";
import {
  ClinicProfitsReportSchema,
  ConsumablesReportSchema,
  DoctorIncomeReportSchema,
  FieldDoctorVisitsReportSchema,
  InventoryMovementReportSchema,
  KpiSummaryReportSchema,
  PharmacyProfitReportSchema,
  ProfitAndLossReportSchema,
  ProfitPerBatchReportSchema,
  SalesReportSchema,
  UpcomingVaccinationsReportSchema,
  VisitProfitReportSchema,
  type ClinicProfitsParams,
  type ClinicProfitsReport,
  type ConsumablesParams,
  type ConsumablesReport,
  type DoctorIncomeParams,
  type DoctorIncomeReport,
  type FieldDoctorVisitsParams,
  type FieldDoctorVisitsReport,
  type InventoryMovementParams,
  type InventoryMovementReport,
  type KpiSummaryReport,
  type MyIncomeParams,
  type PeriodParams,
  type PharmacyProfitParams,
  type PharmacyProfitReport,
  type ProfitAndLossReport,
  type ProfitPerBatchReport,
  type ReportExportFormat,
  type SalesParams,
  type SalesReport,
  type UpcomingVaccinationsParams,
  type UpcomingVaccinationsReport,
  type VisitProfitParams,
  type VisitProfitReport,
} from "../schemas/reports";
import { z } from "zod";

// Read-only report wrappers (M12, PRD §7.9). All are `reports.read`-gated server-side except
// `getMyIncome` (auth-only, self-scoped). The JSON wrappers below omit `?format`; file export goes
// through `fetchReportFile` (the host app turns the returned blob into a download).

/** GET /reports/kpi-summary — the four dashboard headline figures (task 1). */
export async function getKpiSummary(client: AxiosInstance): Promise<KpiSummaryReport> {
  const res = await client.get("/reports/kpi-summary");
  return KpiSummaryReportSchema.parse(res.data);
}

/** GET /reports/doctor-income — visit count, revenue and calculated share per doctor (task 3). */
export async function getDoctorIncome(
  client: AxiosInstance,
  params?: DoctorIncomeParams,
): Promise<DoctorIncomeReport> {
  const res = await client.get("/reports/doctor-income", { params });
  return DoctorIncomeReportSchema.parse(res.data);
}

/** GET /reports/my-income — the caller's OWN income (task 5; auth-only, no `reports.read`). */
export async function getMyIncome(
  client: AxiosInstance,
  params?: MyIncomeParams,
): Promise<DoctorIncomeReport> {
  const res = await client.get("/reports/my-income", { params });
  return DoctorIncomeReportSchema.parse(res.data);
}

/** GET /reports/clinic-profits — revenue, COGS, gross-margin net and the partner split (task 3). */
export async function getClinicProfits(
  client: AxiosInstance,
  params?: ClinicProfitsParams,
): Promise<ClinicProfitsReport> {
  const res = await client.get("/reports/clinic-profits", { params });
  return ClinicProfitsReportSchema.parse(res.data);
}

/** GET /reports/profit-per-batch — per-batch breakdown reconciling to the M9 entitlement (task 3). */
export async function getProfitPerBatch(
  client: AxiosInstance,
  batchId: string,
): Promise<ProfitPerBatchReport> {
  const res = await client.get("/reports/profit-per-batch", { params: { batchId } });
  return ProfitPerBatchReportSchema.parse(res.data);
}

/** GET /reports/profit-and-loss — simplified income statement for a period (task 3). */
export async function getProfitAndLoss(
  client: AxiosInstance,
  params?: PeriodParams,
): Promise<ProfitAndLossReport> {
  const res = await client.get("/reports/profit-and-loss", { params });
  return ProfitAndLossReportSchema.parse(res.data);
}

/** GET /reports/sales — money taken in over a period, by payment method (task 3). */
export async function getSalesReport(
  client: AxiosInstance,
  params?: SalesParams,
): Promise<SalesReport> {
  const res = await client.get("/reports/sales", { params });
  return SalesReportSchema.parse(res.data);
}

/** GET /reports/inventory-movement — inflows/outflows/balance per (location, product) (task 4). */
export async function getInventoryMovement(
  client: AxiosInstance,
  params?: InventoryMovementParams,
): Promise<InventoryMovementReport> {
  const res = await client.get("/reports/inventory-movement", { params });
  return InventoryMovementReportSchema.parse(res.data);
}

/** GET /reports/consumables — internal-use consumption summed by (location, product) (M27). */
export async function getConsumables(
  client: AxiosInstance,
  params?: ConsumablesParams,
): Promise<ConsumablesReport> {
  const res = await client.get("/reports/consumables", { params });
  return ConsumablesReportSchema.parse(res.data);
}

/** GET /reports/field-doctor-visits — the field-visit log, cursor-paged (task 4). */
export async function getFieldDoctorVisits(
  client: AxiosInstance,
  params?: FieldDoctorVisitsParams,
): Promise<FieldDoctorVisitsReport> {
  const res = await client.get("/reports/field-doctor-visits", { params });
  return FieldDoctorVisitsReportSchema.parse(res.data);
}

/** GET /reports/upcoming-vaccinations — vaccinations due in a date range, by customer (task 4). */
export async function getUpcomingVaccinations(
  client: AxiosInstance,
  params?: UpcomingVaccinationsParams,
): Promise<UpcomingVaccinationsReport> {
  const res = await client.get("/reports/upcoming-vaccinations", { params });
  return UpcomingVaccinationsReportSchema.parse(res.data);
}

/** GET /reports/pharmacy-profit — drug/product revenue, cost and gross margin per product (M20). */
export async function getPharmacyProfit(
  client: AxiosInstance,
  params?: PharmacyProfitParams,
): Promise<PharmacyProfitReport> {
  const res = await client.get("/reports/pharmacy-profit", { params });
  return PharmacyProfitReportSchema.parse(res.data);
}

/** GET /reports/in-clinic-visit-profit — revenue/COGS/margin per in-clinic visit, farm/clinic-sliceable (M20). */
export async function getInClinicVisitProfit(
  client: AxiosInstance,
  params?: VisitProfitParams,
): Promise<VisitProfitReport> {
  const res = await client.get("/reports/in-clinic-visit-profit", { params });
  return VisitProfitReportSchema.parse(res.data);
}

/** GET /reports/field-visit-profit — revenue/COGS/margin per field visit, farm/clinic-sliceable (M20). */
export async function getFieldVisitProfit(
  client: AxiosInstance,
  params?: VisitProfitParams,
): Promise<VisitProfitReport> {
  const res = await client.get("/reports/field-visit-profit", { params });
  return VisitProfitReportSchema.parse(res.data);
}

/** GET /reports/farm-account-status — a customer's full ledger statement (task 4; reuses M3). */
export async function getFarmAccountStatus(
  client: AxiosInstance,
  customerId: string,
  params?: PeriodParams,
): Promise<StatementResponse> {
  const res = await client.get("/reports/farm-account-status", {
    params: { customerId, ...params },
  });
  return StatementResponseSchema.parse(res.data);
}

const EntitlementListSchema = z.array(DoctorEntitlementResponseSchema);

/** GET /reports/doctor-entitlements — entitlements by doctor + status (task 4; reuses the M9 list). */
export async function getDoctorEntitlementsReport(
  client: AxiosInstance,
  params?: EntitlementListParams,
): Promise<DoctorEntitlementResponse[]> {
  const res = await client.get("/reports/doctor-entitlements", { params });
  return EntitlementListSchema.parse(res.data);
}

// ---- Export ---------------------------------------------------------------

/** A downloaded report file: the raw bytes plus the server-suggested filename. */
export interface ReportFile {
  blob: Blob;
  filename: string;
}

const FILENAME_RE = /filename\*?=(?:UTF-8''|")?([^";]+)"?/i;

/**
 * Fetch a report as a generated file (`?format=xlsx|pdf`). Platform-neutral: returns the raw bytes +
 * the filename parsed from `Content-Disposition` (the backend sets an ASCII base name). The host app
 * turns this into a browser download — keeping DOM concerns out of the shared package.
 */
export async function fetchReportFile(
  client: AxiosInstance,
  path: string,
  format: ReportExportFormat,
  params?: Record<string, unknown>,
): Promise<ReportFile> {
  const res = await client.get(path, {
    params: { ...params, format },
    responseType: "blob",
  });
  const disposition = String(res.headers?.["content-disposition"] ?? "");
  const match = FILENAME_RE.exec(disposition);
  const filename = match?.[1]
    ? decodeURIComponent(match[1])
    : `${path.split("/").pop() ?? "report"}.${format}`;
  return { blob: res.data as Blob, filename };
}
