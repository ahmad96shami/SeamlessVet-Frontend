import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  adjustStock,
  listFieldInventories,
  listMovements,
  listStock,
  loadField,
  receiveStock,
  unloadField,
  type AdjustStockInput,
  type ApiError,
  type FieldInventoryResponse,
  type IdentifierResponse,
  type InventoryMovementResponse,
  type LoadFieldInput,
  type MovementListParams,
  type ReceiveStockInput,
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

/** POST /inventory/receive — receive stock into the warehouse. Refetches all inventory reads. */
export function useReceiveStock() {
  const qc = useQueryClient();
  return useMutation<IdentifierResponse, ApiError, ReceiveStockInput>({
    mutationFn: (input) => receiveStock(apiClient, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
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

/** POST /inventory/load-field — warehouse → field two-leg transfer. Refetches all inventory reads. */
export function useLoadField() {
  const qc = useQueryClient();
  return useMutation<IdentifierResponse, ApiError, LoadFieldInput>({
    mutationFn: (input) => loadField(apiClient, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

/** POST /inventory/unload-field — field → warehouse two-leg transfer. Refetches all inventory reads. */
export function useUnloadField() {
  const qc = useQueryClient();
  return useMutation<IdentifierResponse, ApiError, UnloadFieldInput>({
    mutationFn: (input) => unloadField(apiClient, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
