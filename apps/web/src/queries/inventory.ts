import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  adjustStock,
  consumeStock,
  listExpiring,
  listFieldInventories,
  listLots,
  listMovements,
  listStock,
  loadField,
  receiveStock,
  unloadField,
  type AdjustStockInput,
  type ApiError,
  type ConsumeStockInput,
  type ReceiveStockInput,
  type ExpiringParams,
  type ExpiringProduct,
  type FieldInventoryResponse,
  type IdentifierResponse,
  type InventoryLot,
  type InventoryMovementResponse,
  type LoadFieldInput,
  type LotListParams,
  type MovementListParams,
  type StockLevelResponse,
  type StockListParams,
  type UnloadFieldInput,
} from "@vet/shared";

import { apiClient } from "@/services/apiClient";

const KEY = "inventory";

/** GET /inventory/stock — current on-hand per (product, location); offset-paged. */
export function useStock(params: StockListParams) {
  return useQuery<StockLevelResponse[], ApiError>({
    queryKey: [KEY, "stock", params],
    queryFn: () => listStock(apiClient, params),
    placeholderData: (prev) => prev,
  });
}

/** GET /inventory/movements — append-only movement history, newest first; offset-paged. */
export function useMovements(params: MovementListParams) {
  return useQuery<InventoryMovementResponse[], ApiError>({
    queryKey: [KEY, "movements", params],
    queryFn: () => listMovements(apiClient, params),
    placeholderData: (prev) => prev,
  });
}

/**
 * GET /inventory/field-inventories — field doctors' inventories. Used to label field stock rows
 * with the owning doctor and as the load/unload picker (W2.4). Small + slow-changing → cached.
 */
export function useFieldInventories() {
  return useQuery<FieldInventoryResponse[], ApiError>({
    queryKey: [KEY, "field-inventories"],
    queryFn: () => listFieldInventories(apiClient),
    staleTime: 60_000,
  });
}

/**
 * GET /inventory/lots — a product's FEFO lots (cost + expiry + remaining), earliest-expiry first.
 * Gated on a productId (the lots dialog opens per stock row), so pass `enabled` to skip until open.
 */
export function useInventoryLots(params: LotListParams, enabled = true) {
  return useQuery<InventoryLot[], ApiError>({
    queryKey: [KEY, "lots", params],
    queryFn: () => listLots(apiClient, params),
    enabled: enabled && !!params.productId,
  });
}

/** GET /inventory/expiring — on-hand lots near expiry (lot-accurate near-expiry view). */
export function useExpiringStock(params?: ExpiringParams) {
  return useQuery<ExpiringProduct[], ApiError>({
    queryKey: [KEY, "expiring", params ?? {}],
    queryFn: () => listExpiring(apiClient, params),
    placeholderData: (prev) => prev,
  });
}

/**
 * POST /inventory/receive — receive stock into a warehouse (defaults to the central one). Used for
 * the "opening stock" seed on product/vaccine create and any purchase-order receive. Refetches all
 * inventory reads. Opts out of the global error toast so callers can word their own message (the
 * product create succeeded even if the follow-up receive failed).
 */
export function useReceiveStock() {
  const qc = useQueryClient();
  return useMutation<IdentifierResponse, ApiError, ReceiveStockInput>({
    mutationFn: (input) => receiveStock(apiClient, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
    meta: { skipGlobalErrorToast: true },
  });
}

/** POST /inventory/adjust — signed delta correction at a location. Refetches all inventory reads. */
export function useAdjustStock() {
  const qc = useQueryClient();
  return useMutation<IdentifierResponse, ApiError, AdjustStockInput>({
    mutationFn: (input) => adjustStock(apiClient, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

/** POST /inventory/consume — record internal use of a consumable (M27). Refetches all inventory reads. */
export function useConsumeStock() {
  const qc = useQueryClient();
  return useMutation<IdentifierResponse, ApiError, ConsumeStockInput>({
    mutationFn: (input) => consumeStock(apiClient, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

/**
 * POST /inventory/load-field — warehouse → field two-leg transfer. Refetches all inventory reads.
 * Fired once per line by the load dialog, which shows per-line errors inline + one summary toast —
 * so it opts out of the global error toast (which would otherwise stack one per failed line).
 */
export function useLoadField() {
  const qc = useQueryClient();
  return useMutation<IdentifierResponse, ApiError, LoadFieldInput>({
    mutationFn: (input) => loadField(apiClient, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
    meta: { skipGlobalErrorToast: true },
  });
}

/** POST /inventory/unload-field — field → warehouse two-leg transfer. Refetches all inventory reads. */
export function useUnloadField() {
  const qc = useQueryClient();
  return useMutation<IdentifierResponse, ApiError, UnloadFieldInput>({
    mutationFn: (input) => unloadField(apiClient, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
    meta: { skipGlobalErrorToast: true }, // per-line dialog owns the messaging (see useLoadField)
  });
}
