import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { Icon } from "@/components/ui/icon";
import { useStock } from "@/queries/inventory";
import { useRegistrationRequests } from "@/queries/registrationRequests";
import { cn } from "@/lib/utils";

interface AlertItem {
  tone: "red" | "amber" | "teal" | "navy";
  icon: "warn" | "user" | "shield";
  title: string;
  body: string;
  to: string;
}

/**
 * Dashboard alerts column — collapses three data sources into a single feed: low-stock items
 * (red/amber depending on count), pending registration requests (admin only), and a callout for
 * any unread system notifications. Each item deep-links to where the user can act on it.
 */
export function AlertsCard({ includeRegistrationRequests = false }: { includeRegistrationRequests?: boolean }) {
  const { t } = useTranslation();
  const lowStock = useStock({ lowStockOnly: true });
  const pendingRegs = useRegistrationRequests("pending", { enabled: includeRegistrationRequests });

  const items: AlertItem[] = [];

  const lowStockRows = lowStock.data ?? [];
  if (lowStockRows.length > 0) {
    items.push({
      tone: lowStockRows.length >= 5 ? "red" : "amber",
      icon: "warn",
      title: t("dashboard.alerts.lowStockTitle"),
      body: t("dashboard.alerts.lowStockBody", { count: lowStockRows.length }),
      to: "/inventory/alerts",
    });
  }

  if (includeRegistrationRequests) {
    const pending = pendingRegs.data ?? [];
    if (pending.length > 0) {
      items.push({
        tone: "teal",
        icon: "user",
        title: t("dashboard.alerts.pendingRegistrationsTitle"),
        body: t("dashboard.alerts.pendingRegistrationsBody", { count: pending.length }),
        to: "/admin/registration-requests",
      });
    }
  }

  return (
    <div className="card">
      <div className="section-head">
        <h4>{t("dashboard.alerts.title")}</h4>
      </div>
      {items.length === 0 ? (
        <div className="py-6 text-center text-sm text-muted-foreground">{t("dashboard.alerts.empty")}</div>
      ) : (
        <div className="vstack" style={{ gap: 10 }}>
          {items.map((it, i) => {
            const IconComp = it.icon === "user" ? Icon.user : it.icon === "shield" ? Icon.shield : Icon.warn;
            return (
              <Link key={i} to={it.to} className={cn("alert", it.tone, "block")}>
                <div className="alert-ico">
                  <IconComp size={18} />
                </div>
                <div>
                  <b>{it.title}</b>
                  <div style={{ marginTop: 4, color: "var(--ink-700)" }}>{it.body}</div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
