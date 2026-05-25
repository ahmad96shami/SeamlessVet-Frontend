import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createPartner,
  createPartnershipShare,
  deletePartner,
  deletePartnershipShare,
  listPartners,
  listPartnershipShares,
  updatePartner,
  updatePartnershipShare,
  type ApiError,
  type IdentifierResponse,
  type PartnerCreateRequest,
  type PartnerListParams,
  type PartnerPatchRequest,
  type PartnerResponse,
  type PartnershipShareCreateRequest,
  type PartnershipShareListParams,
  type PartnershipSharePatchRequest,
  type PartnershipShareResponse,
} from "@vet/shared";

import { apiClient } from "@/services/apiClient";

const PARTNERS = "partners";
const SHARES = "partnership-shares";

// ---- Partners -------------------------------------------------------------

export function usePartners(params: PartnerListParams, enabled = true) {
  return useQuery<PartnerResponse[], ApiError>({
    queryKey: [PARTNERS, params],
    queryFn: () => listPartners(apiClient, params),
    placeholderData: (prev) => prev,
    enabled,
  });
}

export function useCreatePartner() {
  const qc = useQueryClient();
  return useMutation<IdentifierResponse, ApiError, PartnerCreateRequest>({
    mutationFn: (body) => createPartner(apiClient, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [PARTNERS] }),
  });
}

export function useUpdatePartner() {
  const qc = useQueryClient();
  return useMutation<IdentifierResponse, ApiError, { id: string; body: PartnerPatchRequest }>({
    mutationFn: ({ id, body }) => updatePartner(apiClient, id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [PARTNERS] }),
  });
}

export function useDeletePartner() {
  const qc = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => deletePartner(apiClient, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [PARTNERS] });
      qc.invalidateQueries({ queryKey: [SHARES] }); // a delete cascades to the partner's live shares
    },
  });
}

// ---- Partnership shares ---------------------------------------------------

export function usePartnershipShares(params: PartnershipShareListParams, enabled = true) {
  return useQuery<PartnershipShareResponse[], ApiError>({
    queryKey: [SHARES, params],
    queryFn: () => listPartnershipShares(apiClient, params),
    placeholderData: (prev) => prev,
    enabled,
  });
}

export function useCreatePartnershipShare() {
  const qc = useQueryClient();
  return useMutation<IdentifierResponse, ApiError, PartnershipShareCreateRequest>({
    mutationFn: (body) => createPartnershipShare(apiClient, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [SHARES] }),
  });
}

export function useUpdatePartnershipShare() {
  const qc = useQueryClient();
  return useMutation<
    IdentifierResponse,
    ApiError,
    { id: string; body: PartnershipSharePatchRequest }
  >({
    mutationFn: ({ id, body }) => updatePartnershipShare(apiClient, id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [SHARES] }),
  });
}

export function useDeletePartnershipShare() {
  const qc = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => deletePartnershipShare(apiClient, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [SHARES] }),
  });
}
