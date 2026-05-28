import { formatCurrency } from "@vet/shared";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Money } from "@/components/ui/money";

import { Icon } from "@/components/ui/icon";
import { useMyIncome } from "@/queries/reports";
import { useAuthStore } from "@/stores/authStore";
import { GreetingHeader } from "@/routes/dashboard/widgets/GreetingHeader";
import { RecentVisitsCard } from "@/routes/dashboard/widgets/RecentVisitsCard";
import { TodayScheduleCard } from "@/routes/dashboard/widgets/TodayScheduleCard";
import { StatCard } from "@/routes/reports/StatCard";

function monthRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  return { from, to };
}

/** Doctor landing — schedule filtered to me, this-month income snapshot, my recent visits. */
export function VetDashboard() {
  const { t, i18n } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const doctorId = user?.userId;
  const range = useMemo(() => monthRange(), []);
  const income = useMyIncome(range);
  const myRevenue = income.data?.totalRevenue ?? 0;
  const myShare = income.data?.totalCalculatedShare ?? 0;

  return (
    <div className="space-y-5">
      <GreetingHeader subtitle={t("dashboard.subtitle.vet")} />

      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard
          tone="teal"
          icon={<Icon.receipt className="size-5" />}
          value={<Money value={myRevenue} />}
          label={t("dashboard.vet.monthRevenue")}
        />
        <Link to="/my-income" className="block">
          <StatCard
            tone="navy"
            icon={<Icon.shield className="size-5" />}
            value={<Money value={myShare} />}
            label={t("dashboard.vet.monthShare")}
          />
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <TodayScheduleCard doctorId={doctorId} limit={8} />
        <RecentVisitsCard doctorId={doctorId} limit={6} />
      </div>
    </div>
  );
}
