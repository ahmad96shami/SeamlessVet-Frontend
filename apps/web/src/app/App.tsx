import { useEffect } from "react";
import { BrowserRouter } from "react-router-dom";

import { AppRoutes } from "@/routes/AppRoutes";
import { setOnAuthError } from "@/services/apiClient";
import { setPlatformOnAuthError } from "@/services/platformApiClient";
import { startSyncEngine } from "@/services/syncEngine";
import { useAuthStore } from "@/stores/authStore";
import { usePlatformAuthStore } from "@/stores/platformAuthStore";

export function App() {
  const restore = useAuthStore((s) => s.restore);
  const handleAuthError = useAuthStore((s) => s.handleAuthError);
  const handleEnvironmentSuspended = useAuthStore((s) => s.handleEnvironmentSuspended);
  const restorePlatform = usePlatformAuthStore((s) => s.restore);
  const handlePlatformAuthError = usePlatformAuthStore((s) => s.handleAuthError);

  useEffect(() => {
    // An involuntary session end flips the store to logged-out (→ guards redirect to /login).
    // A suspended center carries its own notice; everything else is treated as expired.
    setOnAuthError((reason) =>
      reason === "suspended" ? handleEnvironmentSuspended() : handleAuthError(),
    );
    restore();
    // The platform realm (W25) restores independently — its own token store, no refresh, no
    // tenant/center concepts. A rejected platform token routes back to /platform/login.
    setPlatformOnAuthError(handlePlatformAuthError);
    restorePlatform();
  }, [restore, handleAuthError, handleEnvironmentSuspended, restorePlatform, handlePlatformAuthError]);

  useEffect(() => {
    // Connectivity listeners + replay the offline write-queue on reconnect / at boot.
    return startSyncEngine();
  }, []);

  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
