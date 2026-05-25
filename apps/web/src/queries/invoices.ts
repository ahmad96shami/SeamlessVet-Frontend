import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getInvoice,
  issuePosInvoice,
  listInvoices,
  voidInvoice,
  type ApiError,
  type IdentifierResponse,
  type InvoiceListParams,
  type InvoiceResponse,
  type PosInvoiceInput,
} from "@vet/shared";

import { apiClient } from "@/services/apiClient";

const KEY = "invoices";

export function useInvoices(params: InvoiceListParams) {
  return useQuery<InvoiceResponse[], ApiError>({
    queryKey: [KEY, params],
    queryFn: () => listInvoices(apiClient, params),
    placeholderData: (prev) => prev, // keep rows visible while paging/filtering
  });
}

export function useInvoice(id: string | null) {
  return useQuery<InvoiceResponse, ApiError>({
    queryKey: [KEY, "detail", id],
    queryFn: () => getInvoice(apiClient, id as string),
    enabled: id !== null,
  });
}

/** POST /pos/invoices — deducts stock + posts the credit portion to the customer ledger. */
export function useIssuePosInvoice() {
  const qc = useQueryClient();
  return useMutation<IdentifierResponse, ApiError, PosInvoiceInput>({
    mutationFn: (input) => issuePosInvoice(apiClient, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: ["inventory"] }); // sale_deduct moved stock
      qc.invalidateQueries({ queryKey: ["customers"] }); // ledger balance changed (credit sale)
      qc.invalidateQueries({ queryKey: ["statement"] });
    },
  });
}

/** POST /invoices/{id}/void — appends a void row + a compensating ledger entry. */
export function useVoidInvoice() {
  const qc = useQueryClient();
  return useMutation<IdentifierResponse, ApiError, string>({
    mutationFn: (id) => voidInvoice(apiClient, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["statement"] });
    },
  });
}
