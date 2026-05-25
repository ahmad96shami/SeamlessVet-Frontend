import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  activateContract,
  cancelContract,
  completeContract,
  createContract,
  createContractMedicationPrice,
  deleteContractMedicationPrice,
  getContract,
  listContractMedicationPrices,
  listContracts,
  updateContract,
  updateContractMedicationPrice,
  type ApiError,
  type ContractCreateRequest,
  type ContractListParams,
  type ContractMedicationPriceCreateRequest,
  type ContractMedicationPricePatchRequest,
  type ContractMedicationPriceResponse,
  type ContractPatchRequest,
  type ContractResponse,
  type IdentifierResponse,
} from "@vet/shared";

import { apiClient } from "@/services/apiClient";

const KEY = "contracts";
const PRICES = "contract-medication-prices";

export function useContracts(params: ContractListParams) {
  return useQuery<ContractResponse[], ApiError>({
    queryKey: [KEY, params],
    queryFn: () => listContracts(apiClient, params),
    placeholderData: (prev) => prev,
  });
}

export function useContract(id: string | null) {
  return useQuery<ContractResponse, ApiError>({
    queryKey: [KEY, "detail", id],
    queryFn: () => getContract(apiClient, id as string),
    enabled: id !== null,
  });
}

export function useContractMedicationPrices(contractId: string | null) {
  return useQuery<ContractMedicationPriceResponse[], ApiError>({
    queryKey: [PRICES, contractId],
    queryFn: () => listContractMedicationPrices(apiClient, contractId as string),
    enabled: contractId !== null,
  });
}

export function useCreateContract() {
  const qc = useQueryClient();
  return useMutation<IdentifierResponse, ApiError, ContractCreateRequest>({
    mutationFn: (body) => createContract(apiClient, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdateContract() {
  const qc = useQueryClient();
  return useMutation<IdentifierResponse, ApiError, { id: string; body: ContractPatchRequest }>({
    mutationFn: ({ id, body }) => updateContract(apiClient, id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

/** Lifecycle transitions — online-only; each invalidates the contracts cache for the new status. */
export function useContractTransition(
  kind: "activate" | "complete" | "cancel",
) {
  const qc = useQueryClient();
  const fn =
    kind === "activate" ? activateContract : kind === "complete" ? completeContract : cancelContract;
  return useMutation<IdentifierResponse, ApiError, string>({
    mutationFn: (id) => fn(apiClient, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useCreateContractMedicationPrice(contractId: string) {
  const qc = useQueryClient();
  return useMutation<IdentifierResponse, ApiError, ContractMedicationPriceCreateRequest>({
    mutationFn: (body) => createContractMedicationPrice(apiClient, contractId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [PRICES, contractId] }),
  });
}

export function useUpdateContractMedicationPrice(contractId: string) {
  const qc = useQueryClient();
  return useMutation<
    IdentifierResponse,
    ApiError,
    { priceId: string; body: ContractMedicationPricePatchRequest }
  >({
    mutationFn: ({ priceId, body }) =>
      updateContractMedicationPrice(apiClient, contractId, priceId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [PRICES, contractId] }),
  });
}

export function useDeleteContractMedicationPrice(contractId: string) {
  const qc = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: (priceId) => deleteContractMedicationPrice(apiClient, contractId, priceId),
    onSuccess: () => qc.invalidateQueries({ queryKey: [PRICES, contractId] }),
  });
}
