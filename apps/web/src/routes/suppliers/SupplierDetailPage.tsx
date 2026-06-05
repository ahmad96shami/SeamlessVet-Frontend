import { type SupplierResponse } from "@vet/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Money } from "@/components/ui/money";
import { cn } from "@/lib/utils";
import { balanceClass, statusVariant } from "@/routes/customers/ledgerStatus";
import { useSupplier } from "@/queries/suppliers";
import { SupplierFormDialog } from "@/routes/suppliers/SupplierFormDialog";
import { SupplierPaymentsSection } from "@/routes/suppliers/SupplierPaymentsSection";
import { SupplierStatementSection } from "@/routes/suppliers/SupplierStatementSection";

export function SupplierDetailPage() {
  const { id = "" } = useParams();
  const { t } = useTranslation();
  const query = useSupplier(id || null);
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
        <BackLink label={t("suppliers.backToList")} />
        <p className="text-sm text-muted-foreground">{t("suppliers.notFound")}</p>
      </div>
    );
  }

  const s: SupplierResponse = query.data;
  const contactBits = [s.phonePrimary, s.phoneSecondary, s.taxNumber, s.address, s.email].filter(
    Boolean,
  ) as string[];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <BackLink label={t("suppliers.backToList")} />

      <header className="flex flex-wrap items-start gap-4">
        <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Icon.truck className="size-7" />
        </div>
        <div className="flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{s.name}</h1>
            <Badge variant={statusVariant(s.ledgerStatus)}>
              {t(`ledgerStatus.${s.ledgerStatus}`, { defaultValue: s.ledgerStatus })}
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

      {/* Balance — positive = the clinic owes the supplier (an outstanding payable).
          No dir="ltr" wrapper: it would drag the amount to the card's LEFT edge (the customer
          card only gets away with it because flex shrink-wraps its block); Money self-isolates. */}
      <div className="rounded-2xl border p-4">
        <div className="text-sm text-muted-foreground">{t("suppliers.balanceOwed")}</div>
        <div className={cn("text-2xl font-bold", balanceClass(s.balance))}>
          <Money value={s.balance} />
        </div>
      </div>

      <SupplierPaymentsSection supplierId={s.id} />

      <SupplierStatementSection
        supplierId={s.id}
        supplierName={s.name}
        supplierPhone={s.phonePrimary}
        fallbackBalance={s.balance}
      />

      <SupplierFormDialog open={editOpen} supplier={s} onClose={() => setEditOpen(false)} />
    </div>
  );
}

function BackLink({ label }: { label: string }) {
  return (
    <Link
      to="/finance/suppliers"
      className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
    >
      <Icon.chevronRight className="size-4 ltr:hidden" />
      <Icon.chevronLeft className="size-4 rtl:hidden" />
      {label}
    </Link>
  );
}
