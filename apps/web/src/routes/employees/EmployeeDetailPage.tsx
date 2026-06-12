import { formatDate, type EmployeeResponse } from "@vet/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Money } from "@/components/ui/money";
import { cn } from "@/lib/utils";
import { balanceClass, statusVariant } from "@/routes/customers/ledgerStatus";
import { useEmployee } from "@/queries/employees";
import { EmployeeFormDialog } from "@/routes/employees/EmployeeFormDialog";
import { EmployeeStatementSection } from "@/routes/employees/EmployeeStatementSection";

export function EmployeeDetailPage() {
  const { id = "" } = useParams();
  const { t, i18n } = useTranslation();
  const query = useEmployee(id || null);
  const [editOpen, setEditOpen] = useState(false);

  if (query.isLoading) {
    return (
      <div className="grid h-64 place-items-center">
        <Icon.spinner className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <BackLink label={t("employees.backToList")} />
        <p className="text-sm text-muted-foreground">{t("employees.notFound")}</p>
      </div>
    );
  }

  const e: EmployeeResponse = query.data;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <BackLink label={t("employees.backToList")} />

      <header className="flex flex-wrap items-start gap-4">
        <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Icon.user className="size-7" />
        </div>
        <div className="flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{e.fullName}</h1>
            <Badge variant={statusVariant(e.ledgerStatus)}>
              {t(`ledgerStatus.${e.ledgerStatus}`, { defaultValue: e.ledgerStatus })}
            </Badge>
            {e.active ? null : <Badge variant="secondary">{t("employees.activeNo")}</Badge>}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            {e.jobTitle ? <span>{e.jobTitle}</span> : null}
            <span>
              {t("employees.monthlySalary")}:{" "}
              <b className="font-medium text-foreground" dir="ltr">
                <Money value={e.monthlySalary} />
              </b>
            </span>
            {e.hiredAt ? (
              <span>
                {t("employees.hiredAt")}: {formatDate(e.hiredAt, i18n.language)}
              </span>
            ) : null}
          </div>
          {e.notes ? <p className="text-sm text-muted-foreground">{e.notes}</p> : null}
        </div>
        <Button variant="secondary" onClick={() => setEditOpen(true)}>
          <Icon.edit className="size-4" />
          {t("admin.common.edit")}
        </Button>
      </header>

      {/* Balance — positive = the clinic owes the employee unpaid salary; negative = an outstanding
          loan. Money self-isolates its direction, so no dir="ltr" wrapper. */}
      <div className="rounded-2xl border p-4">
        <div className="text-sm text-muted-foreground">{t("employees.balanceOwed")}</div>
        <div className={cn("text-2xl font-bold", balanceClass(e.balance))}>
          <Money value={e.balance} />
        </div>
      </div>

      <EmployeeStatementSection employeeId={e.id} employeeName={e.fullName} />

      <EmployeeFormDialog open={editOpen} employee={e} onClose={() => setEditOpen(false)} />
    </div>
  );
}

function BackLink({ label }: { label: string }) {
  return (
    <Link
      to="/finance/employees"
      className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
    >
      <Icon.chevronRight className="size-4 ltr:hidden" />
      <Icon.chevronLeft className="size-4 rtl:hidden" />
      {label}
    </Link>
  );
}
