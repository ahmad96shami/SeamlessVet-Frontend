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
 * Route gate: admit the user if their `role` is allowed OR (when `permission` is given) their
 * effective permissions include it — mirroring the nav's OR-gating so a per-user grant (e.g. a
 * receptionist granted `invoices.write`) can reach the screen, not just see the link. Client-side
 * gating is UX only; the server enforces fine-grained permissions and returns 403.
 */
export function RequireRole({
  roles,
  permission,
  children,
}: {
  roles: string[];
  permission?: string;
  children: ReactNode;
}) {
  const user = useAuthStore((s) => s.user);
  const allowed =
    !!user && (roles.includes(user.role) || (permission ? user.permissions.includes(permission) : false));
  if (!allowed) return <Navigate to="/" replace />;
  return <>{children}</>;
}
