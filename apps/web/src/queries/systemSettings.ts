import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getSystemSettings,
  updateSystemSettings,
  type ApiError,
  type IdentifierResponse,
  type SystemSettingsPatchRequest,
  type SystemSettingsResponse,
} from "@vet/shared";

import { apiClient } from "@/services/apiClient";

const KEY = "system-settings";

export function useSystemSettings() {
  return useQuery<SystemSettingsResponse, ApiError>({
    queryKey: [KEY],
    queryFn: () => getSystemSettings(apiClient),
  });
}

export function useUpdateSystemSettings() {
  const qc = useQueryClient();
  return useMutation<IdentifierResponse, ApiError, SystemSettingsPatchRequest>({
    mutationFn: (body) => updateSystemSettings(apiClient, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
