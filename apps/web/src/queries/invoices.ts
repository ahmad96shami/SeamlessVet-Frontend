import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  buildPosInvoiceRequest,
  getInvoice,
  listInvoices,
  voidInvoice,
  type ApiError,
  type IdentifierResponse,
  type InvoiceListParams,
  type InvoiceResponse,
  type PosInvoiceInput,
} from "@vet/shared";

import { apiClient } from "@/services/apiClient";
import { sendOrQueue, type SendOrQueueResult } from "@/services/sendOrQueue";

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

/**
 * POST /pos/invoices — deducts stock + posts the credit portion to the customer ledger. Online or
 * offline (W7): sends-or-queues the issuance. The financial side effects (assembly, stock deduct,
 * ledger) stay server-authoritative, so an offline sale is parked and only reconciled on replay —
 * we don't fabricate an invoice/ledger locally. Online success invalidates the affected reads.
 */
export function useIssuePosInvoice() {
  const qc = useQueryClient();
  return useMutation<SendOrQueueResult, ApiError, PosInvoiceInput>({
    mutationFn: (input) => sendOrQueue(buildPosInvoiceRequest(input)),
    onSuccess: (res) => {
      if (res.queued) return; // reconciled by the sync engine on reconnect
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: ["inventory"] }); // sale_deduct moved stock
      qc.invalidateQueries({ queryKey: ["customers"] }); // ledger balance changed (credit sale)
      qc.invalidateQueries({ queryKey: ["statement"] });
      // Billing a visit's checkup fee / night stay flips their server `billed` flags — refresh the
      // visit + night-stays reads so the «مُفوترة» badges (tabs) and POS reference lines stay current.
      qc.invalidateQueries({ queryKey: ["visits"] });
      qc.invalidateQueries({ queryKey: ["night-stays"] });
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
