import { useEffect } from "react";
import { BrowserRouter } from "react-router-dom";

import { AppRoutes } from "@/routes/AppRoutes";
import { setOnAuthError } from "@/services/apiClient";
import { startSyncEngine } from "@/services/syncEngine";
import { useAuthStore } from "@/stores/authStore";

export function App() {
  const restore = useAuthStore((s) => s.restore);
  const handleAuthError = useAuthStore((s) => s.handleAuthError);
  const handleEnvironmentSuspended = useAuthStore((s) => s.handleEnvironmentSuspended);

  useEffect(() => {
    // An involuntary session end flips the store to logged-out (→ guards redirect to /login).
    // A suspended center carries its own notice; everything else is treated as expired.
    setOnAuthError((reason) =>
      reason === "suspended" ? handleEnvironmentSuspended() : handleAuthError(),
    );
    restore();
  }, [restore, handleAuthError, handleEnvironmentSuspended]);

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
