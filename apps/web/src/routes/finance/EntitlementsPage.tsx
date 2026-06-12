import type { ColumnDef } from "@tanstack/react-table";
import { formatDate, type DoctorEntitlementResponse } from "@vet/shared";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { DataTable } from "@/components/data-table/DataTable";
import { Pagination } from "@/components/data-table/Pagination";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { Money } from "@/components/ui/money";
import { Select } from "@/components/ui/select";
import { useDoctorOptions } from "@/hooks/useDoctorOptions";
import { useOffsetPager } from "@/hooks/useOffsetPager";
import { cn } from "@/lib/utils";
import { useEntitlements } from "@/queries/entitlements";

/**
 * Doctor entitlements (finance tab) — a **read-only accrual** view (M28/M30). An entitlement is the
 * supervision fee, computed automatically when a batch is settled and credited to the responsible
 * doctor's partner ledger; there is no approve/pay lifecycle and no settlement lock anymore. This
 * screen only lists what the engine accrued (disbursement happens on the doctor's ledger statement).
 */
export function EntitlementsPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [doctorId, setDoctorId] = useState("");
  const { page, skip, take, canPrev, next, prev, reset } = useOffsetPager(20);

  useEffect(() => reset(), [doctorId, reset]);

  const doctors = useDoctorOptions();
  const all = useEntitlements({ take: 200 }); // unfiltered, for the total-accrued summary
  const query = useEntitlements({ doctorId: doctorId || undefined, skip, take });
  const rows = query.data ?? [];

  const total = useMemo(() => {
    const list = all.data ?? [];
    return { amount: list.reduce((sum, e) => sum + e.computedAmount, 0), count: list.length };
  }, [all.data]);

  const doctorName = (id: string | null | undefined) =>
    (id ? doctors.byId.get(id) : undefined) ?? "—";

  const columns = useMemo<ColumnDef<DoctorEntitlementResponse>[]>(
    () => [
      {
        accessorKey: "doctorId",
        header: t("finance.entitlements.colDoctor"),
        cell: ({ row }) => <span className="font-medium">{doctorName(row.original.doctorId)}</span>,
      },
      {
        id: "source",
        header: t("finance.entitlements.colSource"),
        cell: ({ row }) => (
          <Badge variant="secondary">
            {row.original.batchId
              ? t("finance.entitlements.sourceBatch")
              : t("finance.entitlements.sourceVisit")}
          </Badge>
        ),
      },
      {
        accessorKey: "calculationSystem",
        header: t("finance.entitlements.colSystem"),
        cell: ({ row }) =>
          t(`entitlementSystem.${row.original.calculationSystem}`, {
            defaultValue: row.original.calculationSystem,
          }),
      },
      {
        accessorKey: "createdAt",
        header: t("finance.entitlements.colDate"),
        cell: ({ row }) => (
          <span className="tabular-nums text-muted-foreground" dir="ltr">
            {formatDate(row.original.createdAt, lang)}
          </span>
        ),
      },
      {
        accessorKey: "computedAmount",
        header: t("finance.entitlements.colAmount"),
        cell: ({ row }) => (
          <span className={cn("font-medium", row.original.computedAmount <= 0 && "text-muted-foreground")}>
            <Money value={row.original.computedAmount} />
          </span>
        ),
      },
    ],
    [t, lang, doctors.byId],
  );

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t("finance.entitlements.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("finance.entitlements.subtitle")}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={doctorId}
          onChange={(e) => setDoctorId(e.target.value)}
          containerClassName="w-56"
        >
          <option value="">{`${t("finance.entitlements.colDoctor")}: ${t("finance.all")}`}</option>
          {doctors.options.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </Select>
        <span className="flex-1" />
        {/* Read-only roll-up — the engine's total accrual across all doctors. */}
        <div className="flex items-center gap-2 rounded-xl border bg-muted/30 px-3 py-2 text-sm">
          <Icon.chart className="size-4 text-muted-foreground" />
          <span className="text-muted-foreground">{t("finance.entitlements.totalAccrued")}</span>
          <span className="font-bold text-navy-900"><Money value={total.amount} /></span>
          <span className="text-xs text-muted-foreground">({total.count})</span>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={rows}
        isLoading={query.isLoading}
        emptyMessage={t("finance.entitlements.empty")}
      />
      <Pagination
        page={page + 1}
        canPrev={canPrev}
        canNext={rows.length === take}
        onPrev={prev}
        onNext={next}
      />
    </div>
  );
}
