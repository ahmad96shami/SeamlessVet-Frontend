import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createBatch,
  deleteBatch,
  getBatch,
  listBatches,
  updateBatch,
  type ApiError,
  type BatchCreateRequest,
  type BatchListParams,
  type BatchPatchRequest,
  type BatchResponse,
  type IdentifierResponse,
} from "@vet/shared";

import { apiClient } from "@/services/apiClient";

const KEY = "batches";
// Closing a batch computes entitlements server-side, so batch writes also refresh entitlements.
const ENTITLEMENTS = "entitlements";

export function useBatches(params: BatchListParams) {
  return useQuery<BatchResponse[], ApiError>({
    queryKey: [KEY, params],
    queryFn: () => listBatches(apiClient, params),
    placeholderData: (prev) => prev,
  });
}

export function useBatch(id: string | null) {
  return useQuery<BatchResponse, ApiError>({
    queryKey: [KEY, "detail", id],
    queryFn: () => getBatch(apiClient, id as string),
    enabled: id !== null,
  });
}

export function useCreateBatch() {
  const qc = useQueryClient();
  return useMutation<IdentifierResponse, ApiError, BatchCreateRequest>({
    mutationFn: (body) => createBatch(apiClient, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdateBatch() {
  const qc = useQueryClient();
  return useMutation<IdentifierResponse, ApiError, { id: string; body: BatchPatchRequest }>({
    mutationFn: ({ id, body }) => updateBatch(apiClient, id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: [ENTITLEMENTS] });
    },
  });
}

export function useDeleteBatch() {
  const qc = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => deleteBatch(apiClient, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
