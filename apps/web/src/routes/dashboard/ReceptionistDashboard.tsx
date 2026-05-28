import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { GreetingHeader } from "@/routes/dashboard/widgets/GreetingHeader";
import { RecentVisitsCard } from "@/routes/dashboard/widgets/RecentVisitsCard";
import { TodayScheduleCard } from "@/routes/dashboard/widgets/TodayScheduleCard";

/** Front-of-house landing — today's schedule + quick-actions for the receptionist's workflow. */
export function ReceptionistDashboard() {
  const { t } = useTranslation();

  return (
    <div className="space-y-5">
      <GreetingHeader
        subtitle={t("dashboard.subtitle.receptionist")}
        actions={
          <>
            <Link to="/operations/customers">
              <Button variant="outline" size="sm">
                <Icon.add className="size-4" />
                {t("dashboard.actions.newCustomer")}
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

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <TodayScheduleCard limit={8} />
        <RecentVisitsCard limit={6} />
      </div>
    </div>
  );
}
