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
        {/* Before {children}: passive effects run in JSX order, so the Toaster's ToastState
            subscription must beat any boot-time toast fired from the app's mount effects
            (e.g. the session-expired notice) — sonner drops toasts published pre-subscribe. */}
        <Toaster position="top-center" richColors closeButton />
        {children}
      </PersistQueryClientProvider>
    </ErrorBoundary>
  );
}
