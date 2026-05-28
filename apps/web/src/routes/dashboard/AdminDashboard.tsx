import { formatCurrency, formatNumber } from "@vet/shared";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useKpiSummary } from "@/queries/reports";
import { AlertsCard } from "@/routes/dashboard/widgets/AlertsCard";
import { EntitlementsBreakdownCard } from "@/routes/dashboard/widgets/EntitlementsBreakdownCard";
import { GreetingHeader } from "@/routes/dashboard/widgets/GreetingHeader";
import { RecentVisitsCard } from "@/routes/dashboard/widgets/RecentVisitsCard";
import { TodayScheduleCard } from "@/routes/dashboard/widgets/TodayScheduleCard";
import { VaxRemindersCard } from "@/routes/dashboard/widgets/VaxRemindersCard";
import { StatCard } from "@/routes/reports/StatCard";

/** Admin & accountant dashboard — the canonical "lobby" view from screens-operations-1. */
export function AdminDashboard() {
  const { t, i18n } = useTranslation();
  const kpi = useKpiSummary();
  const k = kpi.data;

  return (
    <div className="space-y-5">
      <GreetingHeader
        actions={
          <>
            <Link to="/reports" className="cap-12">
              <Button variant="ghost" size="sm">
                <Icon.cal className="size-4" />
                {t("dashboard.actions.todayReport")}
              </Button>
            </Link>
            <Link to="/operations/visits">
              <Button variant="teal" size="sm">
                <Icon.add className="size-4" />
                {t("dashboard.actions.newVisit")}
              </Button>
            </Link>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          tone="teal"
          icon={<Icon.stethoscope className="size-5" />}
          value={formatNumber(k?.visitsToday ?? 0, i18n.language)}
          label={t("reports.kpi.visitsToday")}
          isLoading={kpi.isLoading}
        />
        <StatCard
          tone="navy"
          icon={<Icon.receipt className="size-5" />}
          value={formatCurrency(k?.revenueThisMonth ?? 0, i18n.language)}
          label={t("reports.kpi.revenueThisMonth")}
          isLoading={kpi.isLoading}
        />
        <StatCard
          tone="amber"
          icon={<Icon.clock className="size-5" />}
          value={formatNumber(k?.pendingEntitlements ?? 0, i18n.language)}
          label={t("reports.kpi.pendingEntitlements")}
          isLoading={kpi.isLoading}
        />
        <StatCard
          tone="red"
          icon={<Icon.box className="size-5" />}
          value={formatNumber(k?.lowStockItems ?? 0, i18n.language)}
          label={t("reports.kpi.lowStockItems")}
          isLoading={kpi.isLoading}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          <TodayScheduleCard limit={5} />
          <RecentVisitsCard limit={6} />
        </div>
        <div className="space-y-4">
          <AlertsCard includeRegistrationRequests />
          <EntitlementsBreakdownCard />
          <VaxRemindersCard limit={5} />
        </div>
      </div>
    </div>
  );
}
