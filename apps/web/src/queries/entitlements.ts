import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  closeAccount,
  getEntitlement,
  listEntitlements,
  reopenAccount,
  type ApiError,
  type CloseAccountResponse,
  type DoctorEntitlementResponse,
  type EntitlementListParams,
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
