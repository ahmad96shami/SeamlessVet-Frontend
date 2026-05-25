import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createVaccination,
  deleteVaccination,
  listVaccinations,
  updateVaccination,
  type ApiError,
  type IdentifierResponse,
  type VaccinationCreateRequest,
  type VaccinationListParams,
  type VaccinationPatchRequest,
  type VaccinationResponse,
} from "@vet/shared";

import { apiClient } from "@/services/apiClient";

const KEY = "vaccinations";

export function useVaccinations(params: VaccinationListParams, enabled = true) {
  return useQuery<VaccinationResponse[], ApiError>({
    queryKey: [KEY, params],
    queryFn: () => listVaccinations(apiClient, params),
    enabled,
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
