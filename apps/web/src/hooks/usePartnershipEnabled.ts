import { useQuery } from "@tanstack/react-query";
import { listPartners, type ApiError } from "@vet/shared";

import { apiClient } from "@/services/apiClient";

/**
 * Detects whether the current environment is a `partnership` one (so the partners surface should
 * appear). The web JWT carries no environment-mode claim, so we probe `GET /partners`: a 200 means
 * partnership (enabled); a 404 means `solo` (the whole group 404s there) → hidden; a 403 means the
 * caller lacks `partnership.manage` (admin-only) → also hidden. The result is cached for the session.
 */
export function usePartnershipEnabled(): { enabled: boolean; isLoading: boolean } {
  const q = useQuery<boolean, ApiError>({
    queryKey: ["partnership-enabled"],
    queryFn: async () => {
      await listPartners(apiClient, { take: 1 });
      return true;
    },
    retry: false,
    staleTime: Infinity,
    gcTime: Infinity,
  });
  return { enabled: q.data === true, isLoading: q.isPending };
}
