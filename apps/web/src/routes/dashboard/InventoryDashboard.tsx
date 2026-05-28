import { formatNumber } from "@vet/shared";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useStock } from "@/queries/inventory";
import { GreetingHeader } from "@/routes/dashboard/widgets/GreetingHeader";

/** Inventory-staff landing — low-stock list front and centre + receive-stock shortcut. */
export function InventoryDashboard() {
  const { t, i18n } = useTranslation();
  const low = useStock({ lowStockOnly: true });
  const rows = low.data ?? [];

  return (
    <div className="space-y-5">
      <GreetingHeader
        subtitle={t("dashboard.subtitle.inventory")}
        actions={
          <Link to="/inventory">
            <Button variant="teal" size="sm">
              <Icon.box className="size-4" />
              {t("dashboard.actions.openInventory")}
            </Button>
          </Link>
        }
      />

      <div className="card flush">
        <div className="card-head">
          <div>
            <h3>{t("dashboard.inventory.lowStock")}</h3>
            <div className="sub">{t("dashboard.inventory.lowStockSubtitle", { count: rows.length })}</div>
          </div>
          <Link to="/inventory/alerts" className="cap-12 text-primary">
            {t("dashboard.viewAll")}
          </Link>
        </div>
        {low.isLoading ? (
          <div className="grid place-items-center py-10">
            <Icon.spinner className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">{t("dashboard.inventory.empty")}</div>
        ) : (
          rows.slice(0, 10).map((r) => (
            <div key={`${r.locationType}:${r.locationId}:${r.productId}`} className="row">
              <div className="av red" style={{ width: 32, height: 32 }}>
                <Icon.box size={16} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="name truncate">{r.nameAr}</div>
              </div>
              <span className="pill red">
                {formatNumber(r.quantity, i18n.language)} / {formatNumber(r.reorderPoint ?? 0, i18n.language)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
