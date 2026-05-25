import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cancelVisit,
  completeVisit,
  createVisit,
  getVisit,
  listVisits,
  updateVisit,
  type ApiError,
  type IdentifierResponse,
  type VisitCreateRequest,
  type VisitListParams,
  type VisitPatchRequest,
  type VisitResponse,
} from "@vet/shared";

import { apiClient } from "@/services/apiClient";

const KEY = "visits";

export function useVisits(params: VisitListParams) {
  return useQuery<VisitResponse[], ApiError>({
    queryKey: [KEY, params],
    queryFn: () => listVisits(apiClient, params),
    placeholderData: (prev) => prev, // keep rows visible while paging/filtering
  });
}

export function useVisit(id: string | null) {
  return useQuery<VisitResponse, ApiError>({
    queryKey: [KEY, "detail", id],
    queryFn: () => getVisit(apiClient, id as string),
    enabled: id !== null,
  });
}

export function useCreateVisit() {
  const qc = useQueryClient();
  return useMutation<IdentifierResponse, ApiError, VisitCreateRequest>({
    mutationFn: (body) => createVisit(apiClient, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdateVisit() {
  const qc = useQueryClient();
  return useMutation<IdentifierResponse, ApiError, { id: string; body: VisitPatchRequest }>({
    mutationFn: ({ id, body }) => updateVisit(apiClient, id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

/** POST /visits/{id}/complete — terminal transition. */
export function useCompleteVisit() {
  const qc = useQueryClient();
  return useMutation<IdentifierResponse, ApiError, string>({
    mutationFn: (id) => completeVisit(apiClient, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

/** POST /visits/{id}/cancel — terminal transition. */
export function useCancelVisit() {
  const qc = useQueryClient();
  return useMutation<IdentifierResponse, ApiError, string>({
    mutationFn: (id) => cancelVisit(apiClient, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
