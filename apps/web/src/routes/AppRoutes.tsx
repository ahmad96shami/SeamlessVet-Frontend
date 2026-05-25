import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { Placeholder } from "@/components/Placeholder";
import { AppShell } from "@/components/layout/AppShell";
import { ProductsPage } from "@/routes/admin/ProductsPage";
import { RegistrationRequestsPage } from "@/routes/admin/RegistrationRequestsPage";
import { ServicesPage } from "@/routes/admin/ServicesPage";
import { SettingsPage } from "@/routes/admin/SettingsPage";
import { UsersPage } from "@/routes/admin/UsersPage";
import { LoginPage } from "@/routes/auth/LoginPage";
import { RegisterPage } from "@/routes/auth/RegisterPage";
import { CustomerDetailPage } from "@/routes/customers/CustomerDetailPage";
import { CustomersPage } from "@/routes/customers/CustomersPage";
import { ProtectedRoute, RequireRole } from "@/routes/guards";
import { AlertsPage } from "@/routes/inventory/AlertsPage";
import { MovementsPage } from "@/routes/inventory/MovementsPage";
import { StockPage } from "@/routes/inventory/StockPage";
import { PetTimelinePage } from "@/routes/visits/PetTimelinePage";
import { VisitDetailPage } from "@/routes/visits/VisitDetailPage";
import { VisitsPage } from "@/routes/visits/VisitsPage";
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
          element={
            <RequireRole roles={["admin", "accountant", "receptionist", "vet_clinic", "vet_both"]}>
              <CustomersPage />
            </RequireRole>
          }
        />
        <Route
          path="operations/customers/:id"
          element={
            <RequireRole roles={["admin", "accountant", "receptionist", "vet_clinic", "vet_both"]}>
              <CustomerDetailPage />
            </RequireRole>
          }
        />
        <Route
          path="operations/visits"
          element={
            <RequireRole roles={["admin", "receptionist", "vet_clinic", "vet_both"]}>
              <VisitsPage />
            </RequireRole>
          }
        />
        <Route
          path="operations/visits/:id"
          element={
            <RequireRole roles={["admin", "receptionist", "vet_clinic", "vet_both"]}>
              <VisitDetailPage />
            </RequireRole>
          }
        />
        <Route
          path="operations/pets/:petId/timeline"
          element={
            <RequireRole roles={["admin", "accountant", "receptionist", "vet_clinic", "vet_both"]}>
              <PetTimelinePage />
            </RequireRole>
          }
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
          path="inventory"
          element={
            <RequireRole roles={["admin", "inventory_staff"]}>
              <StockPage />
            </RequireRole>
          }
        />
        <Route
          path="inventory/movements"
          element={
            <RequireRole roles={["admin", "inventory_staff"]}>
              <MovementsPage />
            </RequireRole>
          }
        />
        <Route
          path="inventory/alerts"
          element={
            <RequireRole roles={["admin", "inventory_staff"]}>
              <AlertsPage />
            </RequireRole>
          }
        />
        <Route
          path="admin/registration-requests"
          element={
            <RequireRole roles={["admin"]}>
              <RegistrationRequestsPage />
            </RequireRole>
          }
        />
        <Route
          path="admin/users"
          element={
            <RequireRole roles={["admin"]}>
              <UsersPage />
            </RequireRole>
          }
        />
        <Route
          path="admin/products"
          element={
            <RequireRole roles={["admin"]}>
              <ProductsPage />
            </RequireRole>
          }
        />
        <Route
          path="admin/services"
          element={
            <RequireRole roles={["admin"]}>
              <ServicesPage />
            </RequireRole>
          }
        />
        <Route
          path="admin/settings"
          element={
            <RequireRole roles={["admin"]}>
              <SettingsPage />
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
