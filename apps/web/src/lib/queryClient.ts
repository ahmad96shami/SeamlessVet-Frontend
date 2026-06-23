import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { toApiError } from "@vet/shared";
import { toast } from "sonner";

// The single error-toast authority for the app. Forms surface field-level validation inline
// (applyFieldErrors), so those are skipped here; everything else gets exactly one toast — call
// sites must NOT also toast, or the message shows twice.
function notify(error: unknown): void {
  const apiError = toApiError(error);
  if (!apiError.fieldErrors) toast.error(apiError.message);
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: notify }),
  // A mutation may opt out (`meta: { skipGlobalErrorToast: true }`) when it owns its own error
  // presentation — e.g. a batch dialog that shows per-line errors inline plus one summary toast,
  // where the global handler would otherwise stack one toast per failed line.
  mutationCache: new MutationCache({
    onError: (error, _vars, _ctx, mutation) => {
      if (mutation.meta?.skipGlobalErrorToast) return;
      notify(error);
    },
  }),
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false },
  },
});
