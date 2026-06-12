import { formatDate, formatNumber, type EmployeePaymentResponse } from "@vet/shared";
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
import { useEmployeePayments } from "@/queries/employees";
import { EmployeePaymentDialog } from "@/routes/employees/EmployeePaymentDialog";

export function EmployeePaymentsSection({ employeeId }: { employeeId: string }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [dialogOpen, setDialogOpen] = useState(false);
  const { page, skip, take, canPrev, next, prev } = useOffsetPager(10);

  const query = useEmployeePayments(employeeId, { skip, take });
  const rows = query.data ?? [];

  /** Reference cell: cheque metadata (cheque only) + the loan-deduction note on a paired salary. */
  const refOf = (p: EmployeePaymentResponse): string | null => {
    const bits: string[] = [];
    if (p.method === "cheque") {
      if (p.chequeNumber) bits.push(`#${p.chequeNumber}`);
      if (p.chequeBank) bits.push(p.chequeBank);
      if (p.chequeDueDate) bits.push(formatDate(p.chequeDueDate, lang));
    }
    if (p.loanRepaymentAmount && p.loanRepaymentAmount > 0) {
      bits.push(
        `${t("employees.payment.loanDeduction")}: ${formatNumber(p.loanRepaymentAmount, lang)}`,
      );
    }
    return bits.length ? bits.join(" · ") : null;
  };

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold tracking-tight">{t("employees.payment.history")}</h2>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Icon.plus className="size-4" />
          {t("employees.payment.action")}
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>{t("employees.payment.colDate")}</TableHead>
              <TableHead>{t("employees.payment.colKind")}</TableHead>
              <TableHead>{t("employees.payment.colMethod")}</TableHead>
              <TableHead>{t("employees.payment.colReference")}</TableHead>
              <TableHead className="text-end">{t("employees.payment.colAmount")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isLoading ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={5} className="h-20 text-center">
                  <Icon.spinner className="mx-auto size-5 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={5} className="h-20 text-center text-sm text-muted-foreground">
                  {t("employees.payment.empty")}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((p) => {
                const ref = refOf(p);
                return (
                  <TableRow key={p.id}>
                    {/* dir="ltr" cells flip text-start to the LEFT — force text-end so they line
                        up with the RTL headers; the amount cell stays RTL. */}
                    <TableCell className="text-end" dir="ltr">
                      {formatDate(p.paidAt, lang)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="default">
                        {t(`employeePaymentKind.${p.kind}`, { defaultValue: p.kind })}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {t(`paymentMethod.${p.method}`, { defaultValue: p.method })}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-end text-sm text-muted-foreground" dir="ltr">
                      {ref ?? "—"}
                    </TableCell>
                    <TableCell className="text-end font-medium">
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

      <EmployeePaymentDialog
        open={dialogOpen}
        employeeId={employeeId}
        onClose={() => setDialogOpen(false)}
      />
    </section>
  );
}
