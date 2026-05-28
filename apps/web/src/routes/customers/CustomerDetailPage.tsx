import { formatCurrency, type CustomerResponse } from "@vet/shared";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { Money } from "@/components/ui/money";

import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { useCustomer } from "@/queries/customers";
import { useFieldInventories } from "@/queries/inventory";
import { CloseAccountSection } from "@/routes/customers/CloseAccountSection";
import { CustomerFormDialog } from "@/routes/customers/CustomerFormDialog";
import { PetsSection } from "@/routes/customers/PetsSection";
import { StatementSection } from "@/routes/customers/StatementSection";

export function statusVariant(status: string): BadgeProps["variant"] {
  if (status === "has_debt") return "warning";
  if (status === "closed") return "success";
  return "default"; // open
}

/** Color a balance: positive = owes (red), negative = in credit (green), zero = muted. */
export function balanceClass(balance: number): string {
  if (balance > 0) return "text-destructive";
  if (balance < 0) return "text-success";
  return "text-muted-foreground";
}

function TypeIcon({ type, className }: { type: string; className?: string }) {
  const I = type === "home" ? Icon.home : Icon.briefcase;
  return <I className={className} />;
}

export function CustomerDetailPage() {
  const { id = "" } = useParams();
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
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
            <p className="text-sm text-muted-foreground" dir="auto">
              {contactBits.join(" · ")}
            </p>
          ) : null}
        </div>
        <Button variant="secondary" onClick={() => setEditOpen(true)}>
          <Icon.edit className="size-4" />
          {t("admin.common.edit")}
        </Button>
      </header>

      <div className="rounded-2xl border p-4">
        <div className="text-sm text-muted-foreground">{t("customers.statement.currentBalance")}</div>
        <div className={cn("text-2xl font-bold", balanceClass(c.balance))} dir="ltr">
          <Money value={c.balance} />
        </div>
      </div>

      <CloseAccountSection customer={c} />

      <PetsSection customerId={c.id} />

      <StatementSection customer={c} />

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
