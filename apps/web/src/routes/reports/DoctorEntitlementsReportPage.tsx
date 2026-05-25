import type { ColumnDef } from "@tanstack/react-table";
import {
  ENTITLEMENT_STATUS_VALUES,
  formatCurrency,
  type DoctorEntitlementResponse,
} from "@vet/shared";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { DataTable } from "@/components/data-table/DataTable";
import { Pagination } from "@/components/data-table/Pagination";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { useDoctorOptions } from "@/hooks/useDoctorOptions";
import { useOffsetPager } from "@/hooks/useOffsetPager";
import { cn } from "@/lib/utils";
import { useDoctorEntitlementsReport } from "@/queries/reports";
import { entitlementStatusVariant } from "@/routes/finance/statusVariants";
import { ReportExportButtons } from "@/routes/reports/ReportExportButtons";
import { ReportPageHeader } from "@/routes/reports/ReportPageHeader";

/** Read-only entitlements report (task 4). Settlement actions live on the finance entitlements screen. */
export function DoctorEntitlementsReportPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [doctorId, setDoctorId] = useState("");
  const [status, setStatus] = useState("");
  const { page, skip, take, canPrev, next, prev, reset } = useOffsetPager(20);

  useEffect(() => reset(), [doctorId, status, reset]);

  const doctors = useDoctorOptions();
  const params = { doctorId: doctorId || undefined, status: status || undefined };
  const query = useDoctorEntitlementsReport({ ...params, skip, take });
  const rows = query.data ?? [];

  const columns = useMemo<ColumnDef<DoctorEntitlementResponse>[]>(
    () => [
      {
        accessorKey: "doctorId",
        header: t("reports.doctorIncome.colDoctor"),
        cell: ({ row }) => <span className="font-medium">{doctors.byId.get(row.original.doctorId) ?? "—"}</span>,
      },
      {
        id: "source",
        header: t("finance.entitlements.colSource"),
        cell: ({ row }) => (
          <Badge variant="secondary">
            {row.original.batchId ? t("finance.entitlements.sourceBatch") : t("finance.entitlements.sourceVisit")}
          </Badge>
        ),
      },
      {
        accessorKey: "calculationSystem",
        header: t("finance.entitlements.colSystem"),
        cell: ({ row }) =>
          t(`entitlementSystem.${row.original.calculationSystem}`, { defaultValue: row.original.calculationSystem }),
      },
      {
        accessorKey: "computedAmount",
        header: t("finance.entitlements.colAmount"),
        cell: ({ row }) => (
          <span className={cn("font-semibold", row.original.computedAmount <= 0 && "text-muted-foreground")}>
            {formatCurrency(row.original.computedAmount, lang)}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: t("finance.entitlements.colStatus"),
        cell: ({ row }) => (
          <Badge variant={entitlementStatusVariant(row.original.status)}>
            {t(`entitlementStatus.${row.original.status}`, { defaultValue: row.original.status })}
          </Badge>
        ),
      },
    ],
    [t, lang, doctors.byId],
  );

  return (
    <div className="space-y-4">
      <ReportPageHeader titleKey="finance.entitlements.title" subtitleKey="finance.entitlements.subtitle" />

      <div className="flex flex-wrap items-center gap-2">
        <Select value={doctorId} onChange={(e) => setDoctorId(e.target.value)} containerClassName="w-48">
          <option value="">{t("reports.filters.allDoctors")}</option>
          {doctors.options.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </Select>
        <span className="flex-1" />
        <button type="button" className={cn("chip", status === "" && "active")} onClick={() => setStatus("")}>
          {t("finance.all")}
        </button>
        {ENTITLEMENT_STATUS_VALUES.map((s) => (
          <button key={s} type="button" className={cn("chip", status === s && "active")} onClick={() => setStatus(s)}>
            {t(`entitlementStatus.${s}`)}
          </button>
        ))}
        <ReportExportButtons path="/reports/doctor-entitlements" params={params} />
      </div>

      <DataTable columns={columns} data={rows} isLoading={query.isLoading} emptyMessage={t("finance.entitlements.empty")} />
      <Pagination page={page + 1} canPrev={canPrev} canNext={rows.length === take} onPrev={prev} onNext={next} />
    </div>
  );
}
