import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createService,
  deleteService,
  listServices,
  updateService,
  type ApiError,
  type IdentifierResponse,
  type ServiceListParams,
  type ServiceRequest,
  type ServiceResponse,
} from "@vet/shared";

import { apiClient } from "@/services/apiClient";

const KEY = "services";

export function useServices(params: ServiceListParams) {
  return useQuery<ServiceResponse[], ApiError>({
    queryKey: [KEY, params],
    queryFn: () => listServices(apiClient, params),
    placeholderData: (prev) => prev,
  });
}

export function useCreateService() {
  const qc = useQueryClient();
  return useMutation<IdentifierResponse, ApiError, ServiceRequest>({
    mutationFn: (body) => createService(apiClient, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdateService() {
  const qc = useQueryClient();
  return useMutation<IdentifierResponse, ApiError, { id: string; body: ServiceRequest }>({
    mutationFn: ({ id, body }) => updateService(apiClient, id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useDeleteService() {
  const qc = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => deleteService(apiClient, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
