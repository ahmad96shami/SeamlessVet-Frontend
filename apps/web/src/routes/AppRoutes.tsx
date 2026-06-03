import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { AppShell } from "@/components/layout/AppShell";
import { ProductsPage } from "@/routes/admin/ProductsPage";
import { RegistrationRequestsPage } from "@/routes/admin/RegistrationRequestsPage";
import { ServicesPage } from "@/routes/admin/ServicesPage";
import { SettingsPage } from "@/routes/admin/SettingsPage";
import { UsersPage } from "@/routes/admin/UsersPage";
import { AppointmentsPage } from "@/routes/appointments/AppointmentsPage";
import { LoginPage } from "@/routes/auth/LoginPage";
import { RegisterPage } from "@/routes/auth/RegisterPage";
import { CustomerDetailPage } from "@/routes/customers/CustomerDetailPage";
import { CustomersPage } from "@/routes/customers/CustomersPage";
import { FarmDetailPage } from "@/routes/customers/FarmDetailPage";
import { DashboardPage } from "@/routes/dashboard/DashboardPage";
import { BatchesPage } from "@/routes/finance/BatchesPage";
import { ContractsPage } from "@/routes/finance/ContractsPage";
import { EntitlementsPage } from "@/routes/finance/EntitlementsPage";
import { FinanceLayout } from "@/routes/finance/FinanceLayout";
import { PartnersPage } from "@/routes/finance/PartnersPage";
import { ProtectedRoute, RequireRole } from "@/routes/guards";
import { PurchasesPage } from "@/routes/purchases/PurchasesPage";
import { SupplierDetailPage } from "@/routes/suppliers/SupplierDetailPage";
import { SuppliersPage } from "@/routes/suppliers/SuppliersPage";
import { ClinicProfitsPage } from "@/routes/reports/ClinicProfitsPage";
import { DoctorEntitlementsReportPage } from "@/routes/reports/DoctorEntitlementsReportPage";
import { DoctorIncomePage } from "@/routes/reports/DoctorIncomePage";
import { FarmAccountPage } from "@/routes/reports/FarmAccountPage";
import { FieldVisitsPage } from "@/routes/reports/FieldVisitsPage";
import { InventoryMovementPage } from "@/routes/reports/InventoryMovementPage";
import { MyIncomePage } from "@/routes/reports/MyIncomePage";
import { OverviewPage } from "@/routes/reports/OverviewPage";
import { PharmacyProfitPage } from "@/routes/reports/PharmacyProfitPage";
import { ProfitAndLossPage } from "@/routes/reports/ProfitAndLossPage";
import { ProfitPerBatchPage } from "@/routes/reports/ProfitPerBatchPage";
import { ReportsLayout } from "@/routes/reports/ReportsLayout";
import { SalesPage } from "@/routes/reports/SalesPage";
import { UpcomingVaccinationsPage } from "@/routes/reports/UpcomingVaccinationsPage";
import { InvoicesPage } from "@/routes/pos/InvoicesPage";
import { PosLayout } from "@/routes/pos/PosLayout";
import { PosPage } from "@/routes/pos/PosPage";
import { AlertsPage } from "@/routes/inventory/AlertsPage";
import { MovementsPage } from "@/routes/inventory/MovementsPage";
import { StockPage } from "@/routes/inventory/StockPage";
import { VaccinationCalendarPage } from "@/routes/vaccinations/VaccinationCalendarPage";
import { VaccinationsLayout } from "@/routes/vaccinations/VaccinationsLayout";
import { VaccinationsListPage } from "@/routes/vaccinations/VaccinationsListPage";
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
        <Route index element={<DashboardPage />} />
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
          path="operations/farms/:farmId"
          element={
            <RequireRole roles={["admin", "accountant", "receptionist", "vet_clinic", "vet_both"]}>
              <FarmDetailPage />
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
          path="operations/appointments"
          element={
            <RequireRole roles={["admin", "receptionist", "vet_clinic", "vet_both"]}>
              <AppointmentsPage />
            </RequireRole>
          }
        />
        <Route
          path="vaccinations"
          element={
            <RequireRole roles={["admin", "receptionist", "vet_clinic", "vet_field", "vet_both"]}>
              <VaccinationsLayout />
            </RequireRole>
          }
        >
          <Route index element={<VaccinationsListPage />} />
          <Route path="calendar" element={<VaccinationCalendarPage />} />
        </Route>
        <Route
          path="pos"
          element={
            <RequireRole roles={["admin", "cashier"]}>
              <PosLayout />
            </RequireRole>
          }
        >
          <Route index element={<PosPage />} />
          <Route path="invoices" element={<InvoicesPage />} />
        </Route>
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
          path="finance"
          element={
            <RequireRole roles={["admin", "accountant"]}>
              <FinanceLayout />
            </RequireRole>
          }
        >
          <Route index element={<Navigate to="/finance/contracts" replace />} />
          <Route path="contracts" element={<ContractsPage />} />
          <Route path="batches" element={<BatchesPage />} />
          <Route path="entitlements" element={<EntitlementsPage />} />
          <Route path="partners" element={<PartnersPage />} />
        </Route>
        {/* Suppliers & purchases — finance-section screens, standalone (not under the contracts tabs). */}
        <Route
          path="finance/suppliers"
          element={
            <RequireRole roles={["admin", "accountant"]}>
              <SuppliersPage />
            </RequireRole>
          }
        />
        <Route
          path="finance/suppliers/:id"
          element={
            <RequireRole roles={["admin", "accountant"]}>
              <SupplierDetailPage />
            </RequireRole>
          }
        />
        <Route
          path="finance/purchases"
          element={
            <RequireRole roles={["admin", "accountant"]}>
              <PurchasesPage />
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
              <ReportsLayout />
            </RequireRole>
          }
        >
          <Route index element={<OverviewPage />} />
          <Route path="doctor-income" element={<DoctorIncomePage />} />
          <Route path="clinic-profits" element={<ClinicProfitsPage />} />
          <Route path="profit-per-batch" element={<ProfitPerBatchPage />} />
          <Route path="profit-and-loss" element={<ProfitAndLossPage />} />
          <Route path="pharmacy-profit" element={<PharmacyProfitPage />} />
          <Route path="sales" element={<SalesPage />} />
          <Route path="inventory-movement" element={<InventoryMovementPage />} />
          <Route path="field-visits" element={<FieldVisitsPage />} />
          <Route path="farm-account" element={<FarmAccountPage />} />
          <Route path="vaccinations" element={<UpcomingVaccinationsPage />} />
          <Route path="entitlements" element={<DoctorEntitlementsReportPage />} />
        </Route>

        {/* Doctor self-service income — outside the reports.read gate; any vet may see their own. */}
        <Route
          path="my-income"
          element={
            <RequireRole roles={["admin", "accountant", "vet_clinic", "vet_field", "vet_both"]}>
              <MyIncomePage />
            </RequireRole>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
