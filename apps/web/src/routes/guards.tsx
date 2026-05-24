import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { Icon } from "@/components/ui/icon";
import { useAuthStore } from "@/stores/authStore";

export function FullScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Icon.spinner className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
}

/** Gate authenticated areas; redirect to /login while unauthenticated. */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const status = useAuthStore((s) => s.status);
  const location = useLocation();
  if (status === "unknown") return <FullScreenLoader />;
  if (status !== "authenticated") {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}

/**
 * Role-based route gate. (The JWT carries `role` but not `perms`, so client-side gating is
 * role-based UX; the server enforces fine-grained permissions and returns 403.)
 */
export function RequireRole({ roles, children }: { roles: string[]; children: ReactNode }) {
  const user = useAuthStore((s) => s.user);
  if (!user || !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}
