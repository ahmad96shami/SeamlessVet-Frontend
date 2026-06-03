import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  closeFarmAccount,
  createFarm,
  deleteFarm,
  getFarm,
  getFarmStatement,
  listFarms,
  updateFarm,
  type ApiError,
  type CloseAccountResponse,
  type FarmListParams,
  type FarmRequest,
  type FarmResponse,
  type IdentifierResponse,
  type StatementParams,
  type StatementResponse,
} from "@vet/shared";

import { apiClient } from "@/services/apiClient";

const KEY = "farms";
const STATEMENT = "farm-statement";
const CUSTOMERS = "customers";
const ENTITLEMENTS = "entitlements";

export function useFarms(params: FarmListParams) {
  return useQuery<FarmResponse[], ApiError>({
    queryKey: [KEY, params],
    queryFn: () => listFarms(apiClient, params),
    placeholderData: (prev) => prev,
  });
}

export function useFarm(id: string | null) {
  return useQuery<FarmResponse, ApiError>({
    queryKey: [KEY, "detail", id],
    queryFn: () => getFarm(apiClient, id as string),
    enabled: id !== null,
  });
}

/** GET /farms/{id}/statement — the farm ledger's statement (M16). */
export function useFarmStatement(id: string | null, params: StatementParams) {
  return useQuery<StatementResponse, ApiError>({
    queryKey: [STATEMENT, id, params],
    queryFn: () => getFarmStatement(apiClient, id as string, params),
    enabled: id !== null,
    placeholderData: (prev) => prev,
  });
}

export function useCreateFarm() {
  const qc = useQueryClient();
  return useMutation<IdentifierResponse, ApiError, FarmRequest>({
    mutationFn: (body) => createFarm(apiClient, body),
    // A new farm auto-seeds its ledger server-side → refresh the owning customer's farmLedgers too.
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: [CUSTOMERS] });
    },
  });
}

export function useUpdateFarm() {
  const qc = useQueryClient();
  return useMutation<IdentifierResponse, ApiError, { id: string; body: FarmRequest }>({
    mutationFn: ({ id, body }) => updateFarm(apiClient, id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: [CUSTOMERS] });
    },
  });
}

export function useDeleteFarm() {
  const qc = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => deleteFarm(apiClient, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: [CUSTOMERS] });
    },
  });
}

/**
 * Close one farm's account (M16 per-farm settlement). Computes that farm's entitlements and closes
 * its ledger; the owning customer + other farms are untouched. Refresh farms, customers (aggregate +
 * breakdown), and entitlements caches.
 */
export function useCloseFarmAccount() {
  const qc = useQueryClient();
  return useMutation<CloseAccountResponse, ApiError, string>({
    mutationFn: (farmId) => closeFarmAccount(apiClient, farmId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: [CUSTOMERS] });
      qc.invalidateQueries({ queryKey: [ENTITLEMENTS] });
      qc.invalidateQueries({ queryKey: [STATEMENT] });
    },
  });
}
