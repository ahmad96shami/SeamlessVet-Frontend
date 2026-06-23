import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  buildCreateVisitRequest,
  cancelVisit,
  completeVisit,
  getVisit,
  listVisits,
  scheduleFollowUp,
  updateVisit,
  type ApiError,
  type IdentifierResponse,
  type ScheduleFollowUpRequest,
  type VisitCreateRequest,
  type VisitListParams,
  type VisitPatchRequest,
  type VisitResponse,
} from "@vet/shared";

import { apiClient } from "@/services/apiClient";
import { sendOrQueue, type SendOrQueueResult } from "@/services/sendOrQueue";

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

/**
 * Create a visit, online or offline (W7). Builds the request once (minting the client id + stable
 * idempotency key), optimistically prepends the new visit to every cached list so it appears
 * immediately — including offline, where the names still resolve from the cached reference data —
 * then sends-or-queues it. Online → refetch to adopt the authoritative row; queued → keep the
 * optimistic row until the engine replays it; a real failure → drop it (refetch).
 */
export function useCreateVisit() {
  const qc = useQueryClient();
  return useMutation<SendOrQueueResult, ApiError, VisitCreateRequest>({
    mutationFn: (body) => {
      const descriptor = buildCreateVisitRequest(body);
      const now = new Date().toISOString();
      const optimistic: VisitResponse = {
        id: descriptor.entityId as string,
        visitType: body.visitType,
        customerId: body.customerId,
        petId: body.petId ?? null,
        doctorId: body.doctorId,
        status: body.status ?? "open",
        chiefComplaint: body.chiefComplaint ?? null,
        checkupFeeBilled: false, // a brand-new visit has billed nothing yet
        createdAt: now,
        updatedAt: now,
      };
      qc.setQueriesData<VisitResponse[]>({ queryKey: [KEY] }, (old) =>
        Array.isArray(old) ? [optimistic, ...old] : old,
      );
      return sendOrQueue(descriptor);
    },
    onSuccess: (res) => {
      if (!res.queued) qc.invalidateQueries({ queryKey: [KEY] });
    },
    onError: () => qc.invalidateQueries({ queryKey: [KEY] }),
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      // The completion backstop may post the checkup fee + night-stay charges → their `billed` flags
      // flip; refresh night-stays (visits is [KEY] above) so the «مُفوترة» badges update immediately.
      qc.invalidateQueries({ queryKey: ["night-stays"] });
    },
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

/** POST /visits/{id}/schedule-follow-up — books a follow-up appointment from this visit (M17). */
export function useScheduleFollowUp() {
  const qc = useQueryClient();
  return useMutation<IdentifierResponse, ApiError, { visitId: string; body: ScheduleFollowUpRequest }>({
    mutationFn: ({ visitId, body }) => scheduleFollowUp(apiClient, visitId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["appointments"] }),
  });
}
