import { formatDate, formatNumber, formatQuantity } from "@vet/shared";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { useExpiringStock } from "@/queries/inventory";

/**
 * W16.4 — near-expiry lots, lot-accurate over /inventory/expiring (M25). One row per on-hand lot
 * within the warning window, soonest-expiring first; already-expired lots show in red. Deep-links to
 * the full inventory alerts page.
 */
export function NearExpiryCard({ limit = 10 }: { limit?: number }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const q = useExpiringStock();
  const rows = (q.data ?? []).slice(0, limit);

  return (
    <div className="card flush">
      <div className="card-head">
        <div>
          <h3>{t("dashboard.inventory.nearExpiry")}</h3>
          <div className="sub">{t("dashboard.inventory.nearExpirySubtitle", { count: q.data?.length ?? 0 })}</div>
        </div>
        <Link to="/inventory/alerts" className="cap-12 text-primary">
          {t("dashboard.viewAll")}
        </Link>
      </div>
      {q.isLoading ? (
        <div className="grid place-items-center py-10">
          <Icon.spinner className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState icon={<Icon.box size={20} />} title={t("dashboard.inventory.nearExpiryEmpty")} />
      ) : (
        rows.map((r) => {
          const expired = r.daysUntilExpiry < 0;
          const tone = expired ? "red" : "amber";
          return (
            <div key={r.lotId} className="row">
              <div className={`av ${tone}`} style={{ width: 32, height: 32 }}>
                <Icon.box size={16} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="name truncate">{r.productNameAr}</div>
                <div className="meta truncate" style={{ fontSize: 12 }} dir="ltr">
                  {formatDate(r.expirationDate, lang)}
                  {r.lotNumber ? ` · ${r.lotNumber}` : ""} · {formatQuantity(r.nearExpiryQuantity, lang)}
                </div>
              </div>
              <span className={`pill ${tone}`}>
                {expired
                  ? t("inventory.alerts.expiredAgo", { days: formatNumber(Math.abs(r.daysUntilExpiry), lang) })
                  : t("inventory.alerts.daysLeft", { days: formatNumber(r.daysUntilExpiry, lang) })}
              </span>
            </div>
          );
        })
      )}
    </div>
  );
}
