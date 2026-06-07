import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  closeNightStay,
  createNightStay,
  deleteNightStay,
  listNightStays,
  updateNightStay,
  type ApiError,
  type NightStayCloseRequest,
  type NightStayCreateRequest,
  type NightStayPatchRequest,
  type NightStayResponse,
} from "@vet/shared";

import { apiClient } from "@/services/apiClient";

const KEY = "night-stays";

/** GET /night-stays — a visit's boarding episodes (M17). */
export function useNightStays(visitId: string | null) {
  return useQuery<NightStayResponse[], ApiError>({
    queryKey: [KEY, visitId],
    queryFn: () => listNightStays(apiClient, { visitId: visitId as string, take: 200 }),
    enabled: visitId !== null,
  });
}

export function useCreateNightStay() {
  const qc = useQueryClient();
  return useMutation<NightStayResponse, ApiError, NightStayCreateRequest>({
    mutationFn: (body) => createNightStay(apiClient, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdateNightStay() {
  const qc = useQueryClient();
  return useMutation<NightStayResponse, ApiError, { id: string; body: NightStayPatchRequest }>({
    mutationFn: ({ id, body }) => updateNightStay(apiClient, id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

/**
 * POST /night-stays/{id}/close — records the checkout and counts nights hotel-style. M23: no charge
 * posts here (the stay bills at POS or via the visit-completion backstop); an explicit `checkOutAt`
 * on a closed-unbilled stay re-closes it (recompute).
 */
export function useCloseNightStay() {
  const qc = useQueryClient();
  return useMutation<NightStayResponse, ApiError, { id: string; body?: NightStayCloseRequest }>({
    mutationFn: ({ id, body }) => closeNightStay(apiClient, id, body ?? {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useDeleteNightStay() {
  const qc = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => deleteNightStay(apiClient, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
