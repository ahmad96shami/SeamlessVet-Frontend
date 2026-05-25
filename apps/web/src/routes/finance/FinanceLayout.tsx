import { Outlet } from "react-router-dom";

import { FinanceTabs } from "./FinanceTabs";

/** Finance surface shell: the contracts/batches/entitlements sub-nav over the active screen. */
export function FinanceLayout() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <FinanceTabs />
      <Outlet />
    </div>
  );
}
