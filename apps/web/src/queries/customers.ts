import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCustomer,
  deleteCustomer,
  getCustomer,
  getStatement,
  listCustomers,
  updateCustomer,
  type ApiError,
  type CustomerListParams,
  type CustomerRequest,
  type CustomerResponse,
  type IdentifierResponse,
  type StatementParams,
  type StatementResponse,
} from "@vet/shared";

import { apiClient } from "@/services/apiClient";

const KEY = "customers";
const STATEMENT = "statement";

export function useCustomers(params: CustomerListParams) {
  return useQuery<CustomerResponse[], ApiError>({
    queryKey: [KEY, params],
    queryFn: () => listCustomers(apiClient, params),
    placeholderData: (prev) => prev, // keep rows visible while paging/filtering
  });
}

export function useCustomer(id: string | null) {
  return useQuery<CustomerResponse, ApiError>({
    queryKey: [KEY, "detail", id],
    queryFn: () => getCustomer(apiClient, id as string),
    enabled: id !== null,
  });
}

export function useStatement(id: string | null, params: StatementParams) {
  return useQuery<StatementResponse, ApiError>({
    queryKey: [STATEMENT, id, params],
    queryFn: () => getStatement(apiClient, id as string, params),
    enabled: id !== null,
    placeholderData: (prev) => prev,
  });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation<IdentifierResponse, ApiError, CustomerRequest>({
    mutationFn: (body) => createCustomer(apiClient, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation<IdentifierResponse, ApiError, { id: string; body: CustomerRequest }>({
    mutationFn: ({ id, body }) => updateCustomer(apiClient, id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useDeleteCustomer() {
  const qc = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => deleteCustomer(apiClient, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
