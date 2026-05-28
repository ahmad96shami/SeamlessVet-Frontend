import { formatCurrency } from "@vet/shared";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Money } from "@/components/ui/money";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useSalesReport } from "@/queries/reports";
import { GreetingHeader } from "@/routes/dashboard/widgets/GreetingHeader";
import { StatCard } from "@/routes/reports/StatCard";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

/** Cashier landing — today's takings by payment method + a direct ramp into POS. */
export function CashierDashboard() {
  const { t, i18n } = useTranslation();
  const range = useMemo(() => ({ from: todayIso(), to: todayIso() }), []);
  const sales = useSalesReport(range);
  const byMethod = sales.data?.byMethod ?? [];
  const total = sales.data?.total ?? 0;
  const count = sales.data?.invoiceCount ?? 0;

  return (
    <div className="space-y-5">
      <GreetingHeader
        subtitle={t("dashboard.subtitle.cashier")}
        actions={
          <Link to="/pos">
            <Button variant="teal" size="sm">
              <Icon.receipt className="size-4" />
              {t("dashboard.actions.openPos")}
            </Button>
          </Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard
          tone="teal"
          icon={<Icon.receipt className="size-5" />}
          value={<Money value={total} />}
          label={t("dashboard.cashier.todaysSales")}
        />
        <StatCard
          tone="navy"
          icon={<Icon.box className="size-5" />}
          value={count}
          label={t("dashboard.cashier.invoiceCount")}
        />
      </div>

      <div className="card">
        <div className="section-head">
          <h4>{t("dashboard.cashier.byMethod")}</h4>
          <Link to="/pos/invoices" className="cap-12 text-primary">
            {t("dashboard.viewAll")}
          </Link>
        </div>
        {sales.isLoading ? (
          <div className="grid place-items-center py-10">
            <Icon.spinner className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : byMethod.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">{t("dashboard.cashier.noSales")}</div>
        ) : (
          <div className="space-y-2">
            {byMethod.map((m) => (
              <div key={m.method} className="flex items-center justify-between text-sm">
                <span>{t(`paymentMethod.${m.method}`, { defaultValue: m.method })}</span>
                <span className="font-semibold tabular-nums"><Money value={m.amount} /></span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
