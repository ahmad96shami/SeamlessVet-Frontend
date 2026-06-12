import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  activateContract,
  attachContractFarm,
  cancelContract,
  completeContract,
  createContract,
  detachContractFarm,
  getContract,
  listContractFarms,
  listContracts,
  updateContract,
  type ApiError,
  type ContractCreateRequest,
  type ContractFarmResponse,
  type ContractListParams,
  type ContractPatchRequest,
  type ContractResponse,
  type IdentifierResponse,
} from "@vet/shared";

import { apiClient } from "@/services/apiClient";

const KEY = "contracts";
const FARMS = "contract-farms";

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

// ---- Contract <-> farm coverage (M15) — draft-gated attach/detach ----------

export function useContractFarms(contractId: string | null) {
  return useQuery<ContractFarmResponse[], ApiError>({
    queryKey: [FARMS, contractId],
    queryFn: () => listContractFarms(apiClient, contractId as string),
    enabled: contractId !== null,
  });
}

export function useAttachContractFarm(contractId: string) {
  const qc = useQueryClient();
  return useMutation<IdentifierResponse, ApiError, string>({
    mutationFn: (farmId) => attachContractFarm(apiClient, contractId, { farmId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [FARMS, contractId] }),
  });
}

export function useDetachContractFarm(contractId: string) {
  const qc = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: (farmId) => detachContractFarm(apiClient, contractId, farmId),
    onSuccess: () => qc.invalidateQueries({ queryKey: [FARMS, contractId] }),
  });
}
