import { type CustomerResponse } from "@vet/shared";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { Money } from "@/components/ui/money";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { useCustomer } from "@/queries/customers";
import { useFieldInventories } from "@/queries/inventory";
import { CloseAccountSection } from "@/routes/customers/CloseAccountSection";
import { CustomerFormDialog } from "@/routes/customers/CustomerFormDialog";
import { FarmsSection } from "@/routes/customers/FarmsSection";
import { balanceClass, statusVariant } from "@/routes/customers/ledgerStatus";
import { PetsSection } from "@/routes/customers/PetsSection";
import { StatementSection } from "@/routes/customers/StatementSection";

function TypeIcon({ type, className }: { type: string; className?: string }) {
  const I = type === "home" ? Icon.home : type === "clinic_customer" ? Icon.briefcase : Icon.box;
  return <I className={className} />;
}

export function CustomerDetailPage() {
  const { id = "" } = useParams();
  const { t } = useTranslation();
  const query = useCustomer(id || null);
  const fieldInvs = useFieldInventories();
  const [editOpen, setEditOpen] = useState(false);

  const doctorName = useMemo(() => {
    const docId = query.data?.assignedDoctorId;
    if (!docId) return null;
    return (fieldInvs.data ?? []).find((f) => f.doctorId === docId)?.doctorName ?? null;
  }, [query.data?.assignedDoctorId, fieldInvs.data]);

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
        <BackLink label={t("customers.backToList")} />
        <p className="text-sm text-muted-foreground">{t("customers.notFound")}</p>
      </div>
    );
  }

  const c: CustomerResponse = query.data;
  const farmLedgers = c.farmLedgers ?? [];
  const hasFarms = farmLedgers.length > 0;
  const contactBits = [
    c.phonePrimary,
    c.phoneSecondary,
    c.idNumber,
    c.address,
    c.email,
    doctorName ? `${t("customers.assignedDoctor")}: ${doctorName}` : null,
  ].filter(Boolean) as string[];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <BackLink label={t("customers.backToList")} />

      <header className="flex flex-wrap items-start gap-4">
        <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
          <TypeIcon type={c.type} className="size-7" />
        </div>
        <div className="flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{c.fullName}</h1>
            <Badge variant={statusVariant(c.ledgerStatus)}>
              {t(`ledgerStatus.${c.ledgerStatus}`, { defaultValue: c.ledgerStatus })}
            </Badge>
            <Badge variant="secondary">
              {t(`customerType.${c.type}`, { defaultValue: c.type })}
            </Badge>
          </div>
          {contactBits.length > 0 ? (
            <p className="text-sm text-muted-foreground">{contactBits.join(" · ")}</p>
          ) : null}
        </div>
        <Button variant="secondary" onClick={() => setEditOpen(true)}>
          <Icon.edit className="size-4" />
          {t("admin.common.edit")}
        </Button>
      </header>

      {/* Balance summary — aggregate (own + farm ledgers) with the own balance + per-farm breakdown. */}
      <div className="space-y-3 rounded-2xl border p-4">
        <div className="flex flex-wrap items-start gap-8">
          <div>
            <div className="text-sm text-muted-foreground">
              {hasFarms ? t("customers.aggregate.aggregateBalance") : t("customers.statement.currentBalance")}
            </div>
            <div className={cn("text-2xl font-bold", balanceClass(c.balance))} dir="ltr">
              <Money value={c.balance} />
            </div>
          </div>
          {hasFarms ? (
            <div>
              <div className="text-sm text-muted-foreground">{t("customers.aggregate.ownBalance")}</div>
              <div className={cn("text-lg font-semibold", balanceClass(c.ownBalance))} dir="ltr">
                <Money value={c.ownBalance} />
              </div>
            </div>
          ) : null}
        </div>

        {hasFarms ? (
          <div className="border-t pt-3">
            <div className="mb-2 text-xs font-medium text-muted-foreground">
              {t("customers.aggregate.farmsBalance")}
            </div>
            <ul className="divide-y rounded-xl border">
              {farmLedgers.map((fl) => (
                <li key={fl.farmId} className="flex items-center justify-between gap-2 p-2.5 text-sm">
                  <Link
                    to={`/operations/farms/${fl.farmId}`}
                    className="min-w-0 truncate font-medium hover:underline"
                  >
                    {fl.farmName}
                  </Link>
                  <span className="flex items-center gap-2">
                    <span className={cn("font-medium", balanceClass(fl.balance))} dir="ltr">
                      <Money value={fl.balance} />
                    </span>
                    <Badge variant={statusVariant(fl.status)}>
                      {t(`ledgerStatus.${fl.status}`, { defaultValue: fl.status })}
                    </Badge>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <CloseAccountSection customer={c} />

      <FarmsSection customerId={c.id} farmLedgers={c.farmLedgers} />

      <PetsSection customerId={c.id} />

      <StatementSection
        customerId={c.id}
        ownerName={c.fullName}
        ownerPhone={c.phonePrimary}
        fallbackBalance={c.ownBalance}
      />

      <CustomerFormDialog open={editOpen} customer={c} onClose={() => setEditOpen(false)} />
    </div>
  );
}

function BackLink({ label }: { label: string }) {
  return (
    <Link
      to="/operations/customers"
      className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
    >
      <Icon.chevronRight className="size-4 ltr:hidden" />
      <Icon.chevronLeft className="size-4 rtl:hidden" />
      {label}
    </Link>
  );
}
