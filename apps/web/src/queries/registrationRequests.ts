import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import {
  approveRegistrationRequest,
  listRegistrationRequests,
  rejectRegistrationRequest,
  type ApiError,
  type ApproveRegistrationRequest,
  type RegistrationRequestSummary,
  type RejectRegistrationRequest,
} from "@vet/shared";

import { apiClient } from "@/services/apiClient";

const KEY = "registration-requests";

export function useRegistrationRequests(status: string, options?: { enabled?: boolean }) {
  return useQuery<RegistrationRequestSummary[], ApiError>({
    queryKey: [KEY, status],
    queryFn: () => listRegistrationRequests(apiClient, { status }),
    enabled: options?.enabled ?? true,
  });
}

type OptimisticCtx = { prev: [QueryKey, RegistrationRequestSummary[] | undefined][] };

/**
 * Approve/reject share an optimistic update: the reviewed row leaves every cached
 * registration-request list immediately, rolls back on error, and the lists refetch on settle.
 */
function useReviewMutation<TBody>(
  review: (id: string, body: TBody) => Promise<RegistrationRequestSummary>,
) {
  const qc = useQueryClient();
  return useMutation<RegistrationRequestSummary, ApiError, { id: string; body: TBody }, OptimisticCtx>({
    mutationFn: ({ id, body }) => review(id, body),
    onMutate: async ({ id }) => {
      await qc.cancelQueries({ queryKey: [KEY] });
      const prev = qc.getQueriesData<RegistrationRequestSummary[]>({ queryKey: [KEY] });
      qc.setQueriesData<RegistrationRequestSummary[]>({ queryKey: [KEY] }, (old) =>
        old ? old.filter((r) => r.id !== id) : old,
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      ctx?.prev.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: [KEY] });
    },
  });
}

export function useApproveRegistration() {
  return useReviewMutation<ApproveRegistrationRequest>((id, body) =>
    approveRegistrationRequest(apiClient, id, body),
  );
}

export function useRejectRegistration() {
  return useReviewMutation<RejectRegistrationRequest>((id, body) =>
    rejectRegistrationRequest(apiClient, id, body),
  );
}
