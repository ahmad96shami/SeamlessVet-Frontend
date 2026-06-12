import { formatDate, type DoctorPartnerPaymentResponse } from "@vet/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Pagination } from "@/components/data-table/Pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Money } from "@/components/ui/money";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useOffsetPager } from "@/hooks/useOffsetPager";
import { useDoctorPartnerPayments } from "@/queries/doctorPartners";
import { DoctorPartnerPaymentDialog } from "@/routes/doctor-partners/DoctorPartnerPaymentDialog";

/** Reference cell for a cheque payment: number · bank · due date (empty for other methods). */
function chequeRef(p: DoctorPartnerPaymentResponse, lang: string): string | null {
  if (p.method !== "cheque") return null;
  const bits = [
    p.chequeNumber ? `#${p.chequeNumber}` : null,
    p.chequeBank,
    p.chequeDueDate ? formatDate(p.chequeDueDate, lang) : null,
  ].filter(Boolean) as string[];
  return bits.length ? bits.join(" · ") : null;
}

export function DoctorPartnerPaymentsSection({ doctorPartnerId }: { doctorPartnerId: string }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [dialogOpen, setDialogOpen] = useState(false);
  const { page, skip, take, canPrev, next, prev } = useOffsetPager(10);

  const query = useDoctorPartnerPayments(doctorPartnerId, { skip, take });
  const rows = query.data ?? [];

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold tracking-tight">{t("doctorPartners.payment.history")}</h2>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Icon.plus className="size-4" />
          {t("doctorPartners.payment.action")}
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>{t("doctorPartners.payment.colDate")}</TableHead>
              <TableHead>{t("doctorPartners.payment.colMethod")}</TableHead>
              <TableHead>{t("doctorPartners.payment.colReference")}</TableHead>
              <TableHead className="text-end">{t("doctorPartners.payment.colAmount")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isLoading ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={4} className="h-20 text-center">
                  <Icon.spinner className="mx-auto size-5 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={4} className="h-20 text-center text-sm text-muted-foreground">
                  {t("doctorPartners.payment.empty")}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((p) => {
                const ref = chequeRef(p, lang);
                return (
                  <TableRow key={p.id}>
                    {/* dir="ltr" cells flip text-start to the LEFT — force text-end (= right
                        inside an LTR cell) so they line up with the RTL headers; the amount
                        cell stays RTL so its text-end matches the header's left edge. */}
                    <TableCell className="text-end" dir="ltr">
                      {formatDate(p.paidAt, lang)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {t(`paymentMethod.${p.method}`, { defaultValue: p.method })}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-end text-sm text-muted-foreground" dir="ltr">
                      {ref ?? "—"}
                    </TableCell>
                    <TableCell className="text-end font-medium text-success">
                      <Money value={p.amount} />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      <Pagination
        page={page + 1}
        canPrev={canPrev}
        canNext={rows.length === take}
        onPrev={prev}
        onNext={next}
      />

      <DoctorPartnerPaymentDialog
        open={dialogOpen}
        doctorPartnerId={doctorPartnerId}
        onClose={() => setDialogOpen(false)}
      />
    </section>
  );
}
