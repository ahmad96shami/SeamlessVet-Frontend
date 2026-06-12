import { type DoctorPartnerResponse } from "@vet/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Money } from "@/components/ui/money";
import { cn } from "@/lib/utils";
import { balanceClass, statusVariant } from "@/routes/customers/ledgerStatus";
import { useDoctorPartner } from "@/queries/doctorPartners";
import { DoctorPartnerFormDialog } from "@/routes/doctor-partners/DoctorPartnerFormDialog";
import { DoctorPartnerPaymentsSection } from "@/routes/doctor-partners/DoctorPartnerPaymentsSection";
import { DoctorPartnerStatementSection } from "@/routes/doctor-partners/DoctorPartnerStatementSection";

export function DoctorPartnerDetailPage() {
  const { id = "" } = useParams();
  const { t } = useTranslation();
  const query = useDoctorPartner(id || null);
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
        <BackLink label={t("doctorPartners.backToList")} />
        <p className="text-sm text-muted-foreground">{t("doctorPartners.notFound")}</p>
      </div>
    );
  }

  const p: DoctorPartnerResponse = query.data;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <BackLink label={t("doctorPartners.backToList")} />

      <header className="flex flex-wrap items-start gap-4">
        <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Icon.stethoscope className="size-7" />
        </div>
        <div className="flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{p.doctorName}</h1>
            <Badge variant={statusVariant(p.ledgerStatus)}>
              {t(`ledgerStatus.${p.ledgerStatus}`, { defaultValue: p.ledgerStatus })}
            </Badge>
          </div>
          {p.notes ? <p className="text-sm text-muted-foreground">{p.notes}</p> : null}
        </div>
        <Button variant="secondary" onClick={() => setEditOpen(true)}>
          <Icon.edit className="size-4" />
          {t("admin.common.edit")}
        </Button>
      </header>

      {/* Balance — positive = the clinic owes the doctor (an outstanding payable from earned fees).
          Money self-isolates its direction, so no dir="ltr" wrapper (it would drag the amount left). */}
      <div className="rounded-2xl border p-4">
        <div className="text-sm text-muted-foreground">{t("doctorPartners.balanceOwed")}</div>
        <div className={cn("text-2xl font-bold", balanceClass(p.balance))}>
          <Money value={p.balance} />
        </div>
      </div>

      <DoctorPartnerPaymentsSection doctorPartnerId={p.id} />

      <DoctorPartnerStatementSection doctorPartnerId={p.id} doctorName={p.doctorName} />

      <DoctorPartnerFormDialog open={editOpen} partner={p} onClose={() => setEditOpen(false)} />
    </div>
  );
}

function BackLink({ label }: { label: string }) {
  return (
    <Link
      to="/finance/doctor-partners"
      className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
    >
      <Icon.chevronRight className="size-4 ltr:hidden" />
      <Icon.chevronLeft className="size-4 rtl:hidden" />
      {label}
    </Link>
  );
}
