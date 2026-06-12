import { type DoctorEntitlementResponse } from "@vet/shared";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Money } from "@/components/ui/money";

import { Icon } from "@/components/ui/icon";
import { useDoctorEntitlementsReport } from "@/queries/reports";

function sum(rows: DoctorEntitlementResponse[]): number {
  return rows.reduce((acc, r) => acc + r.computedAmount, 0);
}

/**
 * Doctor entitlements credited this period. **M30:** an entitlement is an immutable accrual posted to
 * the responsible doctor's partner ledger when their supervision batch is settled — there is no
 * pending/approved/paid lifecycle, so this is a single credited total (outstanding balances live on
 * the doctor-partner statements). The donut is skipped (recharts loads only on /reports).
 */
export function EntitlementsBreakdownCard() {
  const { t } = useTranslation();
  const credited = useDoctorEntitlementsReport({ take: 500 });
  const total = sum(credited.data ?? []);

  return (
    <div className="card">
      <div className="section-head">
        <h4>{t("dashboard.entitlements.title")}</h4>
        <Link to="/finance/doctor-partners" className="cap-12 text-primary">
          {t("dashboard.viewAll")}
        </Link>
      </div>
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-muted-foreground">{t("dashboard.entitlements.credited")}</span>
        <span className="text-2xl font-bold tabular-nums">
          <Money value={total} />
        </span>
      </div>
      <div className="alert navy" style={{ marginTop: 12, fontSize: 12 }}>
        <Icon.shield size={14} />
        <div>{t("dashboard.entitlements.note")}</div>
      </div>
    </div>
  );
}
