import { useQuery } from "@tanstack/react-query";
import { listPartners, toApiError } from "@vet/shared";

import { apiClient } from "@/services/apiClient";

/**
 * Detects whether the current environment is a `partnership` one (so the partners surface should
 * appear). The web JWT carries no environment-mode claim, so we probe `GET /partners`: a 200 means
 * partnership (enabled); a 404 means `solo` (the whole group 404s there) → hidden; a 403 means the
 * caller lacks `partnership.manage` (admin-only) → also hidden. The result is cached for the session.
 *
 * The 404/403 outcomes are *expected* (they're how we detect mode), so the query resolves to `false`
 * rather than rejecting — otherwise the global query-error toast would fire "not found" on every
 * finance screen in a solo environment. Any other failure still rejects (and toasts).
 */
export function usePartnershipEnabled(): { enabled: boolean; isLoading: boolean } {
  const q = useQuery<boolean>({
    queryKey: ["partnership-enabled"],
    queryFn: async () => {
      try {
        await listPartners(apiClient, { take: 1 });
        return true;
      } catch (err) {
        const { status } = toApiError(err);
        if (status === 404 || status === 403) return false;
        throw err;
      }
    },
    retry: false,
    staleTime: Infinity,
    gcTime: Infinity,
  });
  return { enabled: q.data === true, isLoading: q.isPending };
}
