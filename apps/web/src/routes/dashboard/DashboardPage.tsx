import { useAuthStore } from "@/stores/authStore";
import { AdminDashboard } from "@/routes/dashboard/AdminDashboard";
import { CashierDashboard } from "@/routes/dashboard/CashierDashboard";
import { InventoryDashboard } from "@/routes/dashboard/InventoryDashboard";
import { ReceptionistDashboard } from "@/routes/dashboard/ReceptionistDashboard";
import { VetDashboard } from "@/routes/dashboard/VetDashboard";

/**
 * The home `/` landing. Dispatches to a role-specific dashboard so every user sees something
 * useful instead of the W9-era placeholder. Unknown roles fall back to the admin layout (which
 * gracefully handles missing data via the per-widget query gates).
 */
export function DashboardPage() {
  const role = useAuthStore((s) => s.user?.role ?? "");
  switch (role) {
    case "admin":
    case "accountant":
      return <AdminDashboard />;
    case "receptionist":
      return <ReceptionistDashboard />;
    case "cashier":
      return <CashierDashboard />;
    case "vet_clinic":
    case "vet_field":
    case "vet_both":
      return <VetDashboard />;
    case "inventory_staff":
      return <InventoryDashboard />;
    default:
      return <AdminDashboard />;
  }
}
