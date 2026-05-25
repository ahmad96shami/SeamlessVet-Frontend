import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createDailyFollowUp,
  deleteDailyFollowUp,
  listDailyFollowUps,
  updateDailyFollowUp,
  type ApiError,
  type DailyFollowUpCreateRequest,
  type DailyFollowUpPatchRequest,
  type DailyFollowUpResponse,
  type IdentifierResponse,
} from "@vet/shared";

import { apiClient } from "@/services/apiClient";

const KEY = "daily-follow-ups";

export function useDailyFollowUps(visitId: string | null) {
  return useQuery<DailyFollowUpResponse[], ApiError>({
    queryKey: [KEY, visitId],
    queryFn: () => listDailyFollowUps(apiClient, { visitId: visitId as string, take: 200 }),
    enabled: visitId !== null,
  });
}

export function useCreateDailyFollowUp() {
  const qc = useQueryClient();
  return useMutation<IdentifierResponse, ApiError, DailyFollowUpCreateRequest>({
    mutationFn: (body) => createDailyFollowUp(apiClient, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdateDailyFollowUp() {
  const qc = useQueryClient();
  return useMutation<IdentifierResponse, ApiError, { id: string; body: DailyFollowUpPatchRequest }>({
    mutationFn: ({ id, body }) => updateDailyFollowUp(apiClient, id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useDeleteDailyFollowUp() {
  const qc = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => deleteDailyFollowUp(apiClient, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
