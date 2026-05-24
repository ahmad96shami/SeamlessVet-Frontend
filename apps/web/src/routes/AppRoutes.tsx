import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { Placeholder } from "@/components/Placeholder";
import { AppShell } from "@/components/layout/AppShell";
import { LoginPage } from "@/routes/auth/LoginPage";
import { RegisterPage } from "@/routes/auth/RegisterPage";
import { ProtectedRoute, RequireRole } from "@/routes/guards";
import { useAuthStore } from "@/stores/authStore";

function PublicOnly({ children }: { children: ReactNode }) {
  const status = useAuthStore((s) => s.status);
  if (status === "authenticated") return <Navigate to="/" replace />;
  return <>{children}</>;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicOnly>
            <LoginPage />
          </PublicOnly>
        }
      />
      <Route
        path="/register"
        element={
          <PublicOnly>
            <RegisterPage />
          </PublicOnly>
        }
      />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<Placeholder titleKey="nav.dashboard" milestone="W9" />} />
        <Route
          path="operations/customers"
          element={<Placeholder titleKey="nav.customers" milestone="W3" />}
        />
        <Route
          path="operations/visits"
          element={<Placeholder titleKey="nav.visits" milestone="W4" />}
        />
        <Route
          path="pos"
          element={
            <RequireRole roles={["admin", "cashier"]}>
              <Placeholder titleKey="nav.pos" milestone="W6" />
            </RequireRole>
          }
        />
        <Route
          path="admin/users"
          element={
            <RequireRole roles={["admin"]}>
              <Placeholder titleKey="nav.users" milestone="W1" />
            </RequireRole>
          }
        />
        <Route
          path="admin/settings"
          element={
            <RequireRole roles={["admin"]}>
              <Placeholder titleKey="nav.settings" milestone="W1" />
            </RequireRole>
          }
        />
        <Route
          path="reports"
          element={
            <RequireRole roles={["admin", "accountant"]}>
              <Placeholder titleKey="nav.reports" milestone="W9" />
            </RequireRole>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
