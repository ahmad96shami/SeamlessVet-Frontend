import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createProcedure,
  deleteProcedure,
  listProcedures,
  updateProcedure,
  type ApiError,
  type IdentifierResponse,
  type ProcedureCreateRequest,
  type ProcedurePatchRequest,
  type ProcedureResponse,
} from "@vet/shared";

import { apiClient } from "@/services/apiClient";

const KEY = "procedures";

export function useProcedures(visitId: string | null) {
  return useQuery<ProcedureResponse[], ApiError>({
    queryKey: [KEY, visitId],
    queryFn: () => listProcedures(apiClient, { visitId: visitId as string, take: 200 }),
    enabled: visitId !== null,
  });
}

export function useCreateProcedure() {
  const qc = useQueryClient();
  return useMutation<IdentifierResponse, ApiError, ProcedureCreateRequest>({
    mutationFn: (body) => createProcedure(apiClient, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdateProcedure() {
  const qc = useQueryClient();
  return useMutation<IdentifierResponse, ApiError, { id: string; body: ProcedurePatchRequest }>({
    mutationFn: ({ id, body }) => updateProcedure(apiClient, id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useDeleteProcedure() {
  const qc = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => deleteProcedure(apiClient, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
