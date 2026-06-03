import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
  getClinicProfits,
  getDoctorEntitlementsReport,
  getDoctorIncome,
  getFarmAccountStatus,
  getFieldDoctorVisits,
  getFieldVisitProfit,
  getInClinicVisitProfit,
  getInventoryMovement,
  getKpiSummary,
  getMyIncome,
  getPharmacyProfit,
  getProfitAndLoss,
  getProfitPerBatch,
  getSalesReport,
  getUpcomingVaccinations,
  type ApiError,
  type ClinicProfitsParams,
  type ClinicProfitsReport,
  type DoctorEntitlementResponse,
  type DoctorIncomeParams,
  type DoctorIncomeReport,
  type EntitlementListParams,
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
  type SalesParams,
  type SalesReport,
  type StatementResponse,
  type UpcomingVaccinationsParams,
  type UpcomingVaccinationsReport,
  type VisitProfitParams,
  type VisitProfitReport,
} from "@vet/shared";

import { apiClient } from "@/services/apiClient";

const KEY = "reports";

export function useKpiSummary() {
  return useQuery<KpiSummaryReport, ApiError>({
    queryKey: [KEY, "kpi-summary"],
    queryFn: () => getKpiSummary(apiClient),
  });
}

export function useDoctorIncome(params: DoctorIncomeParams) {
  return useQuery<DoctorIncomeReport, ApiError>({
    queryKey: [KEY, "doctor-income", params],
    queryFn: () => getDoctorIncome(apiClient, params),
    placeholderData: (prev) => prev,
  });
}

/** Doctor self-service — auth-only, self-scoped to the caller (no `reports.read`). */
export function useMyIncome(params: MyIncomeParams) {
  return useQuery<DoctorIncomeReport, ApiError>({
    queryKey: [KEY, "my-income", params],
    queryFn: () => getMyIncome(apiClient, params),
    placeholderData: (prev) => prev,
  });
}

export function useClinicProfits(params: ClinicProfitsParams) {
  return useQuery<ClinicProfitsReport, ApiError>({
    queryKey: [KEY, "clinic-profits", params],
    queryFn: () => getClinicProfits(apiClient, params),
    placeholderData: (prev) => prev,
  });
}

export function useProfitPerBatch(batchId: string | null) {
  return useQuery<ProfitPerBatchReport, ApiError>({
    queryKey: [KEY, "profit-per-batch", batchId],
    queryFn: () => getProfitPerBatch(apiClient, batchId as string),
    enabled: batchId !== null,
  });
}

export function useProfitAndLoss(params: PeriodParams) {
  return useQuery<ProfitAndLossReport, ApiError>({
    queryKey: [KEY, "profit-and-loss", params],
    queryFn: () => getProfitAndLoss(apiClient, params),
    placeholderData: (prev) => prev,
  });
}

export function useSalesReport(params: SalesParams) {
  return useQuery<SalesReport, ApiError>({
    queryKey: [KEY, "sales", params],
    queryFn: () => getSalesReport(apiClient, params),
    placeholderData: (prev) => prev,
  });
}

export function useInventoryMovement(params: InventoryMovementParams) {
  return useQuery<InventoryMovementReport, ApiError>({
    queryKey: [KEY, "inventory-movement", params],
    queryFn: () => getInventoryMovement(apiClient, params),
    placeholderData: (prev) => prev,
  });
}

/**
 * Cursor-paged field-visit log → `useInfiniteQuery`: each page carries `nextCursor` (null on the
 * last page). `params` excludes `cursor` (the page param drives it); a filter change keys a fresh
 * accumulation. Flatten `data.pages[*].rows` to render; `fetchNextPage` is the "load more".
 */
export function useFieldDoctorVisits(params: Omit<FieldDoctorVisitsParams, "cursor">) {
  return useInfiniteQuery<FieldDoctorVisitsReport, ApiError>({
    queryKey: [KEY, "field-doctor-visits", params],
    queryFn: ({ pageParam }) =>
      getFieldDoctorVisits(apiClient, { ...params, cursor: (pageParam as string) || undefined }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

export function useUpcomingVaccinations(params: UpcomingVaccinationsParams) {
  return useQuery<UpcomingVaccinationsReport, ApiError>({
    queryKey: [KEY, "upcoming-vaccinations", params],
    queryFn: () => getUpcomingVaccinations(apiClient, params),
    placeholderData: (prev) => prev,
  });
}

export function usePharmacyProfit(params: PharmacyProfitParams) {
  return useQuery<PharmacyProfitReport, ApiError>({
    queryKey: [KEY, "pharmacy-profit", params],
    queryFn: () => getPharmacyProfit(apiClient, params),
    placeholderData: (prev) => prev,
  });
}

export function useInClinicVisitProfit(params: VisitProfitParams) {
  return useQuery<VisitProfitReport, ApiError>({
    queryKey: [KEY, "in-clinic-visit-profit", params],
    queryFn: () => getInClinicVisitProfit(apiClient, params),
    placeholderData: (prev) => prev,
  });
}

export function useFieldVisitProfit(params: VisitProfitParams) {
  return useQuery<VisitProfitReport, ApiError>({
    queryKey: [KEY, "field-visit-profit", params],
    queryFn: () => getFieldVisitProfit(apiClient, params),
    placeholderData: (prev) => prev,
  });
}

export function useFarmAccountStatus(customerId: string | null, params: PeriodParams) {
  return useQuery<StatementResponse, ApiError>({
    queryKey: [KEY, "farm-account-status", customerId, params],
    queryFn: () => getFarmAccountStatus(apiClient, customerId as string, params),
    enabled: customerId !== null,
  });
}

export function useDoctorEntitlementsReport(params: EntitlementListParams) {
  return useQuery<DoctorEntitlementResponse[], ApiError>({
    queryKey: [KEY, "doctor-entitlements", params],
    queryFn: () => getDoctorEntitlementsReport(apiClient, params),
    placeholderData: (prev) => prev,
  });
}
