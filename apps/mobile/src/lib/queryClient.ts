import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { toApiError } from "@vet/shared";

// Mirrors apps/web/src/lib/queryClient.ts — same defaults, but mobile has no
// global toast surface yet (web uses sonner). Surface non-field errors to the
// console in dev; per-call sites can Alert.alert as needed (see auth screens).
function notify(error: unknown): void {
  const apiError = toApiError(error);
  if (apiError.fieldErrors) return;
  if (__DEV__) console.warn("[api]", apiError.code, apiError.message);
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: notify }),
  mutationCache: new MutationCache({ onError: notify }),
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});
