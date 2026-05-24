import { useQuery } from "@tanstack/react-query";
import {
  listFieldInventories,
  listStock,
  type ApiError,
  type FieldInventoryResponse,
  type StockLevelResponse,
  type StockListParams,
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
