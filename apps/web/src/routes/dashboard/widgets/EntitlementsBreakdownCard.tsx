import { formatCurrency, type DoctorEntitlementResponse } from "@vet/shared";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Money } from "@/components/ui/money";

import { Icon } from "@/components/ui/icon";
import { useDoctorEntitlementsReport } from "@/queries/reports";

interface Tone {
  status: "pending" | "approved" | "paid";
  color: string;
  labelKey: string;
}

const TONES: Tone[] = [
  { status: "pending", color: "var(--amber)", labelKey: "dashboard.entitlements.pending" },
  { status: "approved", color: "var(--teal-500)", labelKey: "dashboard.entitlements.approved" },
  { status: "paid", color: "var(--green)", labelKey: "dashboard.entitlements.paid" },
];

function sum(rows: DoctorEntitlementResponse[]): number {
  return rows.reduce((acc, r) => acc + r.computedAmount, 0);
}

/**
 * A flat breakdown of doctor entitlements by status (pending / approved / paid) for the current
 * period. Renders three coloured rows with running totals — no donut chart (the design's donut is
 * skipped for this pass since recharts is only loaded on /reports today, and the breakdown is
 * legible on its own at a glance).
 */
export function EntitlementsBreakdownCard() {
  const { t, i18n } = useTranslation();
  const pending = useDoctorEntitlementsReport({ status: "pending", take: 500 });
  const approved = useDoctorEntitlementsReport({ status: "approved", take: 500 });
  const paid = useDoctorEntitlementsReport({ status: "paid", take: 500 });

  const totals = {
    pending: sum(pending.data ?? []),
    approved: sum(approved.data ?? []),
    paid: sum(paid.data ?? []),
  } as const;
  const grand = totals.pending + totals.approved + totals.paid;

  return (
    <div className="card">
      <div className="section-head">
        <h4>{t("dashboard.entitlements.title")}</h4>
        <Link to="/finance/entitlements" className="cap-12 text-primary">
          {t("dashboard.viewAll")}
        </Link>
      </div>
      <div className="vstack" style={{ gap: 10 }}>
        {TONES.map((tone) => (
          <div key={tone.status} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <span className="inline-block size-2.5 rounded-full" style={{ background: tone.color }} />
              {t(tone.labelKey)}
            </span>
            <span className="font-semibold tabular-nums"><Money value={totals[tone.status]} /></span>
          </div>
        ))}
      </div>
      <div className="alert navy" style={{ marginTop: 12, fontSize: 12 }}>
        <Icon.shield size={14} />
        <div>{t("dashboard.entitlements.note", { total: formatCurrency(grand, i18n.language) })}</div>
      </div>
    </div>
  );
}
