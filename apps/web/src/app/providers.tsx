import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import type { ReactNode } from "react";
import { Toaster } from "sonner";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { queryClient } from "@/lib/queryClient";
import {
  QUERY_CACHE_BUSTER,
  QUERY_CACHE_MAX_AGE,
  queryPersister,
  shouldDehydrateQuery,
} from "@/services/queryPersister";
import "@/i18n"; // initialise i18next + RTL direction (side-effect)

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister: queryPersister,
          maxAge: QUERY_CACHE_MAX_AGE,
          buster: QUERY_CACHE_BUSTER,
          // Only the whitelisted reference/hot reads are written to IndexedDB; financial history
          // and admin lists stay server-only. Mutations are never persisted.
          dehydrateOptions: { shouldDehydrateQuery: (q) => q.state.status === "success" && shouldDehydrateQuery(q.queryKey) },
        }}
      >
        {children}
        <Toaster position="top-center" richColors closeButton />
      </PersistQueryClientProvider>
    </ErrorBoundary>
  );
}
