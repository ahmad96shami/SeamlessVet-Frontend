import { Outlet } from "react-router-dom";

import { PosTabs } from "./PosTabs";

/** POS surface shell: the register/invoices sub-nav over a full-height content area. */
export function PosLayout() {
  return (
    <div className="flex h-full flex-col gap-4">
      <PosTabs />
      <div className="min-h-0 flex-1">
        <Outlet />
      </div>
    </div>
  );
}
