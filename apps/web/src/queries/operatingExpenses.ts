import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createOperatingExpense,
  deleteOperatingExpense,
  listOperatingExpenses,
  updateOperatingExpense,
  type ApiError,
  type CreateOperatingExpenseRequest,
  type OperatingExpenseListParams,
  type OperatingExpenseResponse,
  type UpdateOperatingExpenseRequest,
} from "@vet/shared";

import { apiClient } from "@/services/apiClient";

const KEY = "operating-expenses";

export function useOperatingExpenses(params: OperatingExpenseListParams) {
  return useQuery<OperatingExpenseResponse[], ApiError>({
    queryKey: [KEY, params],
    queryFn: () => listOperatingExpenses(apiClient, params),
    placeholderData: (prev) => prev,
  });
}

export function useCreateOperatingExpense() {
  const qc = useQueryClient();
  return useMutation<OperatingExpenseResponse, ApiError, CreateOperatingExpenseRequest>({
    mutationFn: (body) => createOperatingExpense(apiClient, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdateOperatingExpense() {
  const qc = useQueryClient();
  return useMutation<
    OperatingExpenseResponse,
    ApiError,
    { id: string; body: UpdateOperatingExpenseRequest }
  >({
    mutationFn: ({ id, body }) => updateOperatingExpense(apiClient, id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useDeleteOperatingExpense() {
  const qc = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => deleteOperatingExpense(apiClient, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
