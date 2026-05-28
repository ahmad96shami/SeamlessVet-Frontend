import { formatCurrency, formatNumber } from "@vet/shared";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Money } from "@/components/ui/money";

import { Icon } from "@/components/ui/icon";
import { useProductLookup } from "@/hooks/useProductLookup";
import { CHART_NAVY, CHART_PALETTE, CHART_TEAL } from "@/routes/reports/chart";
import { DEFAULT_PERIOD, resolvePeriod, type PeriodValue } from "@/routes/reports/period";
import { ReportFilterBar } from "@/routes/reports/ReportFilterBar";
import { StatCard } from "@/routes/reports/StatCard";
import {
  useDoctorIncome,
  useInventoryMovement,
  useKpiSummary,
  useSalesReport,
} from "@/queries/reports";

/** KPI dashboard (task 1) — the four headline figures plus charts built from real report endpoints. */
export function OverviewPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [period, setPeriod] = useState<PeriodValue>(DEFAULT_PERIOD);
  const range = useMemo(() => resolvePeriod(period), [period]);

  const kpi = useKpiSummary();
  const sales = useSalesReport(range);
  const income = useDoctorIncome({ ...range, take: 50 });
  const movement = useInventoryMovement({ ...range, take: 6 });
  const products = useProductLookup();

  const salesData = (sales.data?.byMethod ?? []).filter((m) => m.amount > 0);
  const incomeRows = income.data?.rows ?? [];
  const barData = incomeRows.slice(0, 8).map((r) => ({
    name: r.doctorName,
    revenue: r.totalRevenue,
    share: r.calculatedShare,
  }));

  return (
    <div className="space-y-5">
      <ReportFilterBar value={period} onChange={setPeriod} />

      {/* KPI strip — a period-independent live snapshot (today / this month / now). */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          tone="teal"
          icon={<Icon.stethoscope className="size-5" />}
          value={formatNumber(kpi.data?.visitsToday ?? 0, lang)}
          label={t("reports.kpi.visitsToday")}
          isLoading={kpi.isLoading}
        />
        <StatCard
          tone="navy"
          icon={<Icon.receipt className="size-5" />}
          value={<Money value={kpi.data?.revenueThisMonth ?? 0} />}
          label={t("reports.kpi.revenueThisMonth")}
          isLoading={kpi.isLoading}
        />
        <StatCard
          tone="amber"
          icon={<Icon.clock className="size-5" />}
          value={formatNumber(kpi.data?.pendingEntitlements ?? 0, lang)}
          label={t("reports.kpi.pendingEntitlements")}
          isLoading={kpi.isLoading}
        />
        <StatCard
          tone="red"
          icon={<Icon.box className="size-5" />}
          value={formatNumber(kpi.data?.lowStockItems ?? 0, lang)}
          label={t("reports.kpi.lowStockItems")}
          isLoading={kpi.isLoading}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Doctor-income bars (revenue vs. calculated share). */}
        <div className="card">
          <div className="section-head mb-3">
            <h4>{t("reports.overview.doctorLeaderboard")}</h4>
            <Link to="/reports/doctor-income" className="cap-12 text-primary">
              {t("reports.overview.viewReport")}
            </Link>
          </div>
          {barData.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">{t("reports.common.noData")}</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={barData} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />
                <YAxis tick={{ fontSize: 11 }} width={48} />
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value), lang)}
                  labelStyle={{ direction: "rtl" }}
                />
                <Bar dataKey="revenue" name={t("reports.doctorIncome.colRevenue")} fill={CHART_TEAL} radius={[4, 4, 0, 0]} />
                <Bar dataKey="share" name={t("reports.doctorIncome.colShare")} fill={CHART_NAVY} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Sales-by-method donut. */}
        <div className="card">
          <div className="section-head mb-3">
            <h4>{t("reports.overview.salesMix")}</h4>
            <span className="cap-12">{t("reports.overview.salesMixHint")}</span>
          </div>
          {salesData.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">{t("reports.overview.noSales")}</p>
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={180}>
                <PieChart>
                  <Pie data={salesData} dataKey="amount" nameKey="method" innerRadius={45} outerRadius={75} paddingAngle={2}>
                    {salesData.map((entry, i) => (
                      <Cell key={entry.method} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(Number(value), lang)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {salesData.map((m, i) => (
                  <div key={m.method} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span
                        className="inline-block size-2.5 rounded-full"
                        style={{ background: CHART_PALETTE[i % CHART_PALETTE.length] }}
                      />
                      {t(`paymentMethod.${m.method}`, { defaultValue: m.method })}
                    </span>
                    <span className="font-semibold tabular-nums"><Money value={m.amount} /></span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Top inventory movement — the most active (location, product) pairs in the period. */}
      <div className="card flush">
        <div className="card-head">
          <h3>{t("reports.overview.topMovement")}</h3>
          <Link to="/reports/inventory-movement" className="cap-12 text-primary">
            {t("reports.overview.viewReport")}
          </Link>
        </div>
        <table className="tbl">
          <thead>
            <tr>
              <th>{t("reports.inventoryMovement.colProduct")}</th>
              <th className="num">{t("reports.inventoryMovement.colIn")}</th>
              <th className="num">{t("reports.inventoryMovement.colOut")}</th>
              <th className="num">{t("reports.inventoryMovement.colBalance")}</th>
            </tr>
          </thead>
          <tbody>
            {(movement.data?.rows ?? []).map((r) => (
              <tr key={`${r.locationType}:${r.locationId}:${r.productId}`}>
                <td className="font-medium">{products.byId.get(r.productId)?.nameAr ?? r.productId}</td>
                <td className="num" style={{ color: "var(--green)" }}>+{formatNumber(r.inflows, lang)}</td>
                <td className="num" style={{ color: "var(--red)" }}>−{formatNumber(r.outflows, lang)}</td>
                <td className="num font-semibold">{formatNumber(r.balance, lang)}</td>
              </tr>
            ))}
            {(movement.data?.rows.length ?? 0) === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                  {t("reports.inventoryMovement.empty")}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
