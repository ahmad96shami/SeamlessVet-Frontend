import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createPet,
  deletePet,
  listPets,
  transferPet,
  updatePet,
  type ApiError,
  type IdentifierResponse,
  type PetListParams,
  type PetRequest,
  type PetResponse,
} from "@vet/shared";

import { apiClient } from "@/services/apiClient";

const KEY = "pets";

export function usePets(params: PetListParams) {
  return useQuery<PetResponse[], ApiError>({
    queryKey: [KEY, params],
    queryFn: () => listPets(apiClient, params),
    placeholderData: (prev) => prev,
  });
}

export function useCreatePet() {
  const qc = useQueryClient();
  return useMutation<IdentifierResponse, ApiError, PetRequest>({
    mutationFn: (body) => createPet(apiClient, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdatePet() {
  const qc = useQueryClient();
  return useMutation<IdentifierResponse, ApiError, { id: string; body: PetRequest }>({
    mutationFn: ({ id, body }) => updatePet(apiClient, id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useDeletePet() {
  const qc = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => deletePet(apiClient, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

/** Transfer to another owner. Invalidates all pet lists — both the old + new owner's lists change. */
export function useTransferPet() {
  const qc = useQueryClient();
  return useMutation<IdentifierResponse, ApiError, { id: string; targetCustomerId: string }>({
    mutationFn: ({ id, targetCustomerId }) => transferPet(apiClient, id, { targetCustomerId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
