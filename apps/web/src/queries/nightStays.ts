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

/** POST /night-stays/{id}/close — counts nights hotel-style and posts the `night_stay` ledger entry. */
export function useCloseNightStay() {
  const qc = useQueryClient();
  return useMutation<NightStayResponse, ApiError, { id: string; body?: NightStayCloseRequest }>({
    mutationFn: ({ id, body }) => closeNightStay(apiClient, id, body ?? {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: ["customers"] }); // the charge moved the ledger balance
    },
  });
}

export function useDeleteNightStay() {
  const qc = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => deleteNightStay(apiClient, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
