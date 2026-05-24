import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { toApiError } from "@vet/shared";
import { toast } from "sonner";

// Forms surface field-level validation inline (applyFieldErrors); everything else gets a toast.
function notify(error: unknown): void {
  const apiError = toApiError(error);
  if (!apiError.fieldErrors) toast.error(apiError.message);
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: notify }),
  mutationCache: new MutationCache({ onError: notify }),
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false },
  },
});
