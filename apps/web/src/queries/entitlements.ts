import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  approveEntitlement,
  closeAccount,
  getEntitlement,
  listEntitlements,
  payEntitlement,
  reopenAccount,
  type ApiError,
  type CloseAccountResponse,
  type DoctorEntitlementResponse,
  type EntitlementListParams,
  type PayEntitlementRequest,
} from "@vet/shared";

import { apiClient } from "@/services/apiClient";

const KEY = "entitlements";
const CUSTOMERS = "customers";

export function useEntitlements(params: EntitlementListParams) {
  return useQuery<DoctorEntitlementResponse[], ApiError>({
    queryKey: [KEY, params],
    queryFn: () => listEntitlements(apiClient, params),
    placeholderData: (prev) => prev,
  });
}

export function useEntitlement(id: string | null) {
  return useQuery<DoctorEntitlementResponse, ApiError>({
    queryKey: [KEY, "detail", id],
    queryFn: () => getEntitlement(apiClient, id as string),
    enabled: id !== null,
  });
}

export function useApproveEntitlement() {
  const qc = useQueryClient();
  return useMutation<DoctorEntitlementResponse, ApiError, string>({
    mutationFn: (id) => approveEntitlement(apiClient, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function usePayEntitlement() {
  const qc = useQueryClient();
  return useMutation<
    DoctorEntitlementResponse,
    ApiError,
    { id: string; body: PayEntitlementRequest }
  >({
    mutationFn: ({ id, body }) => payEntitlement(apiClient, id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

/** Closing an account computes/refreshes entitlements and closes the ledger → refresh both caches. */
export function useCloseAccount() {
  const qc = useQueryClient();
  return useMutation<CloseAccountResponse, ApiError, string>({
    mutationFn: (customerId) => closeAccount(apiClient, customerId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: [CUSTOMERS] });
    },
  });
}

/** Re-opening lifts the settlement lock so the customer can be billed again → refresh customers. */
export function useReopenAccount() {
  const qc = useQueryClient();
  return useMutation<CloseAccountResponse, ApiError, string>({
    mutationFn: (customerId) => reopenAccount(apiClient, customerId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CUSTOMERS] });
    },
  });
}
