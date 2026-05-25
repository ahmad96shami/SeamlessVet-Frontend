import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createPrescription,
  deletePrescription,
  listPrescriptions,
  updatePrescription,
  type ApiError,
  type IdentifierResponse,
  type PrescriptionCreateRequest,
  type PrescriptionPatchRequest,
  type PrescriptionResponse,
} from "@vet/shared";

import { apiClient } from "@/services/apiClient";

const KEY = "prescriptions";

export function usePrescriptions(visitId: string | null) {
  return useQuery<PrescriptionResponse[], ApiError>({
    queryKey: [KEY, visitId],
    queryFn: () => listPrescriptions(apiClient, { visitId: visitId as string, take: 200 }),
    enabled: visitId !== null,
  });
}

export function useCreatePrescription() {
  const qc = useQueryClient();
  return useMutation<IdentifierResponse, ApiError, PrescriptionCreateRequest>({
    mutationFn: (body) => createPrescription(apiClient, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      // An administered_in_clinic script deducts inventory server-side — refresh stock reads.
      qc.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
}

export function useUpdatePrescription() {
  const qc = useQueryClient();
  return useMutation<IdentifierResponse, ApiError, { id: string; body: PrescriptionPatchRequest }>({
    mutationFn: ({ id, body }) => updatePrescription(apiClient, id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useDeletePrescription() {
  const qc = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => deletePrescription(apiClient, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
