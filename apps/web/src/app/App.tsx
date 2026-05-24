import { useEffect } from "react";
import { BrowserRouter } from "react-router-dom";

import { AppRoutes } from "@/routes/AppRoutes";
import { setOnAuthError } from "@/services/apiClient";
import { useAuthStore } from "@/stores/authStore";

export function App() {
  const restore = useAuthStore((s) => s.restore);
  const handleAuthError = useAuthStore((s) => s.handleAuthError);

  useEffect(() => {
    // A failed token refresh flips the store to logged-out (→ guards redirect to /login).
    setOnAuthError(handleAuthError);
    restore();
  }, [restore, handleAuthError]);

  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
