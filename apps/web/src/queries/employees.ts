import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createEmployee,
  deleteEmployee,
  getEmployee,
  getEmployeeStatement,
  listEmployeePayments,
  listEmployees,
  recordEmployeePayment,
  updateEmployee,
  type ApiError,
  type EmployeeCreateRequest,
  type EmployeeListParams,
  type EmployeePatchRequest,
  type EmployeePaymentInput,
  type EmployeePaymentListParams,
  type EmployeePaymentResponse,
  type EmployeeResponse,
  type EmployeeStatementParams,
  type EmployeeStatementResponse,
  type IdentifierResponse,
} from "@vet/shared";

import { apiClient } from "@/services/apiClient";

const KEY = "employees";
const STATEMENT = "employee-statement";
const PAYMENTS = "employee-payments";

export function useEmployees(params: EmployeeListParams) {
  return useQuery<EmployeeResponse[], ApiError>({
    queryKey: [KEY, params],
    queryFn: () => listEmployees(apiClient, params),
    placeholderData: (prev) => prev, // keep rows visible while paging/filtering
  });
}

export function useEmployee(id: string | null) {
  return useQuery<EmployeeResponse, ApiError>({
    queryKey: [KEY, "detail", id],
    queryFn: () => getEmployee(apiClient, id as string),
    enabled: id !== null,
  });
}

export function useEmployeeStatement(id: string | null, params: EmployeeStatementParams) {
  return useQuery<EmployeeStatementResponse, ApiError>({
    queryKey: [STATEMENT, id, params],
    queryFn: () => getEmployeeStatement(apiClient, id as string, params),
    enabled: id !== null,
    placeholderData: (prev) => prev,
  });
}

export function useCreateEmployee() {
  const qc = useQueryClient();
  return useMutation<IdentifierResponse, ApiError, EmployeeCreateRequest>({
    mutationFn: (body) => createEmployee(apiClient, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdateEmployee() {
  const qc = useQueryClient();
  return useMutation<IdentifierResponse, ApiError, { id: string; body: EmployeePatchRequest }>({
    mutationFn: ({ id, body }) => updateEmployee(apiClient, id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useDeleteEmployee() {
  const qc = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => deleteEmployee(apiClient, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useEmployeePayments(employeeId: string | null, params: EmployeePaymentListParams) {
  return useQuery<EmployeePaymentResponse[], ApiError>({
    queryKey: [PAYMENTS, employeeId, params],
    queryFn: () => listEmployeePayments(apiClient, employeeId as string, params),
    enabled: employeeId !== null,
    placeholderData: (prev) => prev,
  });
}

/** Record an employee payment — moves the balance, so refresh the employee, statement & history. */
export function useRecordEmployeePayment(employeeId: string) {
  const qc = useQueryClient();
  return useMutation<IdentifierResponse, ApiError, EmployeePaymentInput>({
    mutationFn: (input) => recordEmployeePayment(apiClient, employeeId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: [STATEMENT, employeeId] });
      qc.invalidateQueries({ queryKey: [PAYMENTS, employeeId] });
    },
  });
}
