import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createSupplier,
  deleteSupplier,
  getSupplier,
  getSupplierStatement,
  listSuppliers,
  recordSupplierPayment,
  updateSupplier,
  type ApiError,
  type IdentifierResponse,
  type SupplierListParams,
  type SupplierPaymentInput,
  type SupplierRequest,
  type SupplierResponse,
  type SupplierStatementParams,
  type SupplierStatementResponse,
} from "@vet/shared";

import { apiClient } from "@/services/apiClient";

const KEY = "suppliers";
const STATEMENT = "supplier-statement";

export function useSuppliers(params: SupplierListParams) {
  return useQuery<SupplierResponse[], ApiError>({
    queryKey: [KEY, params],
    queryFn: () => listSuppliers(apiClient, params),
    placeholderData: (prev) => prev, // keep rows visible while paging/filtering
  });
}

export function useSupplier(id: string | null) {
  return useQuery<SupplierResponse, ApiError>({
    queryKey: [KEY, "detail", id],
    queryFn: () => getSupplier(apiClient, id as string),
    enabled: id !== null,
  });
}

export function useSupplierStatement(id: string | null, params: SupplierStatementParams) {
  return useQuery<SupplierStatementResponse, ApiError>({
    queryKey: [STATEMENT, id, params],
    queryFn: () => getSupplierStatement(apiClient, id as string, params),
    enabled: id !== null,
    placeholderData: (prev) => prev,
  });
}

export function useCreateSupplier() {
  const qc = useQueryClient();
  return useMutation<IdentifierResponse, ApiError, SupplierRequest>({
    mutationFn: (body) => createSupplier(apiClient, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdateSupplier() {
  const qc = useQueryClient();
  return useMutation<IdentifierResponse, ApiError, { id: string; body: SupplierRequest }>({
    mutationFn: ({ id, body }) => updateSupplier(apiClient, id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useDeleteSupplier() {
  const qc = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => deleteSupplier(apiClient, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

/** Record a payment to a supplier — reduces the balance, so refresh both the supplier + its statement. */
export function useRecordSupplierPayment(supplierId: string) {
  const qc = useQueryClient();
  return useMutation<IdentifierResponse, ApiError, SupplierPaymentInput>({
    mutationFn: (input) => recordSupplierPayment(apiClient, supplierId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: [STATEMENT, supplierId] });
    },
  });
}
