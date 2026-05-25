import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getReceiptVoucher,
  issueReceiptVoucher,
  listReceiptVouchers,
  type ApiError,
  type IdentifierResponse,
  type ReceiptVoucherInput,
  type ReceiptVoucherListParams,
  type ReceiptVoucherResponse,
} from "@vet/shared";

import { apiClient } from "@/services/apiClient";

const KEY = "receipt-vouchers";

export function useReceiptVouchers(params: ReceiptVoucherListParams) {
  return useQuery<ReceiptVoucherResponse[], ApiError>({
    queryKey: [KEY, params],
    queryFn: () => listReceiptVouchers(apiClient, params),
    placeholderData: (prev) => prev,
  });
}

export function useReceiptVoucher(id: string | null) {
  return useQuery<ReceiptVoucherResponse, ApiError>({
    queryKey: [KEY, "detail", id],
    queryFn: () => getReceiptVoucher(apiClient, id as string),
    enabled: id !== null,
  });
}

/** POST /receipt-vouchers — records a payment received; posts a `receipt_voucher` ledger credit. */
export function useIssueReceiptVoucher() {
  const qc = useQueryClient();
  return useMutation<IdentifierResponse, ApiError, ReceiptVoucherInput>({
    mutationFn: (input) => issueReceiptVoucher(apiClient, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: ["customers"] }); // balance reduced
      qc.invalidateQueries({ queryKey: ["statement"] });
    },
  });
}
