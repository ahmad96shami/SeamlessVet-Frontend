import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createVaccination,
  deleteVaccination,
  listUpcomingVaccinations,
  listVaccinations,
  updateVaccination,
  type ApiError,
  type IdentifierResponse,
  type VaccinationCreateRequest,
  type VaccinationListParams,
  type VaccinationPatchRequest,
  type VaccinationResponse,
  type VaccinationUpcomingParams,
} from "@vet/shared";

import { apiClient } from "@/services/apiClient";

const KEY = "vaccinations";

export function useVaccinations(params: VaccinationListParams, enabled = true) {
  return useQuery<VaccinationResponse[], ApiError>({
    queryKey: [KEY, params],
    queryFn: () => listVaccinations(apiClient, params),
    enabled,
    placeholderData: (prev) => prev,
  });
}

/** GET /vaccinations/upcoming — drives the W13 calendar (distinct from the reports report). */
export function useVaccinationCalendar(params: VaccinationUpcomingParams, enabled = true) {
  return useQuery<VaccinationResponse[], ApiError>({
    queryKey: [KEY, "upcoming", params],
    queryFn: () => listUpcomingVaccinations(apiClient, params),
    enabled,
    placeholderData: (prev) => prev,
  });
}

export function useCreateVaccination() {
  const qc = useQueryClient();
  return useMutation<IdentifierResponse, ApiError, VaccinationCreateRequest>({
    mutationFn: (body) => createVaccination(apiClient, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdateVaccination() {
  const qc = useQueryClient();
  return useMutation<IdentifierResponse, ApiError, { id: string; body: VaccinationPatchRequest }>({
    mutationFn: ({ id, body }) => updateVaccination(apiClient, id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useDeleteVaccination() {
  const qc = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => deleteVaccination(apiClient, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
