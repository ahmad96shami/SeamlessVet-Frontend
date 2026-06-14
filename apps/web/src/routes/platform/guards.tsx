import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";

import { FullScreenLoader } from "@/routes/guards";
import { usePlatformAuthStore } from "@/stores/platformAuthStore";

/** Gate the platform console; redirect to platform login while unauthenticated (separate realm). */
export function PlatformProtectedRoute({ children }: { children: ReactNode }) {
  const status = usePlatformAuthStore((s) => s.status);
  if (status === "unknown") return <FullScreenLoader />;
  if (status !== "authenticated") return <Navigate to="/platform/login" replace />;
  return <>{children}</>;
}

/** Keep an already-signed-in platform admin out of the platform login page. */
export function PlatformPublicOnly({ children }: { children: ReactNode }) {
  const status = usePlatformAuthStore((s) => s.status);
  if (status === "authenticated") return <Navigate to="/platform/tenants" replace />;
  return <>{children}</>;
}
