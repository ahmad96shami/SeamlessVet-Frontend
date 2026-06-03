import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createPurchaseInvoice,
  listPurchaseInvoices,
  type ApiError,
  type IdentifierResponse,
  type PurchaseInvoiceInput,
  type PurchaseInvoiceListParams,
  type PurchaseInvoiceResponse,
} from "@vet/shared";

import { apiClient } from "@/services/apiClient";

const KEY = "purchases";

export function usePurchaseInvoices(params: PurchaseInvoiceListParams) {
  return useQuery<PurchaseInvoiceResponse[], ApiError>({
    queryKey: [KEY, params],
    queryFn: () => listPurchaseInvoices(apiClient, params),
    placeholderData: (prev) => prev,
  });
}

/**
 * Issue a purchase invoice — one transaction receives the goods into the warehouse AND posts the
 * supplier payable. So refresh the purchases list, the supplier balances, and the inventory stock.
 */
export function useCreatePurchaseInvoice() {
  const qc = useQueryClient();
  return useMutation<IdentifierResponse, ApiError, PurchaseInvoiceInput>({
    mutationFn: (input) => createPurchaseInvoice(apiClient, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: ["suppliers"] });
      qc.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
}
