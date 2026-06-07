import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getBatchSettlement,
  getBatchSettlementPreview,
  settleBatch,
  type ApiError,
  type BatchSettleRequest,
  type BatchSettlement,
  type BatchSettlementPreview,
  type IdentifierResponse,
} from "@vet/shared";

import { apiClient } from "@/services/apiClient";

const KEY = "batch-settlements";

/** The settle screen's read model — re-fetch on focus is fine (server is authoritative on confirm). */
export function useBatchSettlementPreview(batchId: string | null) {
  return useQuery<BatchSettlementPreview, ApiError>({
    queryKey: [KEY, "preview", batchId],
    queryFn: () => getBatchSettlementPreview(apiClient, batchId as string),
    enabled: batchId !== null,
  });
}

/** The settlement document — 404 until the batch is settled, so only fetch when enabled. */
export function useBatchSettlement(batchId: string | null, enabled = true) {
  return useQuery<BatchSettlement, ApiError>({
    queryKey: [KEY, "document", batchId],
    queryFn: () => getBatchSettlement(apiClient, batchId as string),
    enabled: batchId !== null && enabled,
  });
}

/**
 * Settling closes the batch, posts the ledger adjustments, and recomputes the doctor's entitlement —
 * so it touches batches, entitlements, the farm/customer balances and statements, and the reports.
 */
export function useSettleBatch() {
  const qc = useQueryClient();
  return useMutation<IdentifierResponse, ApiError, { batchId: string; body: BatchSettleRequest }>({
    mutationFn: ({ batchId, body }) => settleBatch(apiClient, batchId, body),
    onSuccess: (_res, { batchId }) => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: ["batches"] });
      qc.invalidateQueries({ queryKey: ["entitlements"] });
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["farms"] });
      qc.invalidateQueries({ queryKey: ["statement"] });
      void batchId;
    },
  });
}
