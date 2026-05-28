import type { ColumnDef } from "@tanstack/react-table";
import { formatCurrency, formatNumber, VISIT_TYPE_VALUES, type DoctorIncomeRow } from "@vet/shared";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Money } from "@/components/ui/money";

import { DataTable } from "@/components/data-table/DataTable";
import { Pagination } from "@/components/data-table/Pagination";
import { Select } from "@/components/ui/select";
import { useDoctorOptions } from "@/hooks/useDoctorOptions";
import { useOffsetPager } from "@/hooks/useOffsetPager";
import { useDoctorIncome } from "@/queries/reports";
import { DEFAULT_PERIOD, resolvePeriod, type PeriodValue } from "@/routes/reports/period";
import { ReportExportButtons } from "@/routes/reports/ReportExportButtons";
import { ReportFilterBar } from "@/routes/reports/ReportFilterBar";
import { ReportPageHeader } from "@/routes/reports/ReportPageHeader";
import { SummaryGrid, SummaryStat } from "@/routes/reports/SummaryStat";

export function DoctorIncomePage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [period, setPeriod] = useState<PeriodValue>(DEFAULT_PERIOD);
  const [doctorId, setDoctorId] = useState("");
  const [visitType, setVisitType] = useState("");
  const { page, skip, take, canPrev, next, prev, reset } = useOffsetPager(20);
  const range = useMemo(() => resolvePeriod(period), [period]);

  useEffect(() => reset(), [period, doctorId, visitType, reset]);

  const doctors = useDoctorOptions();
  const params = {
    ...range,
    doctorId: doctorId || undefined,
    visitType: visitType || undefined,
  };
  const query = useDoctorIncome({ ...params, skip, take });
  const rows = query.data?.rows ?? [];

  const columns = useMemo<ColumnDef<DoctorIncomeRow>[]>(
    () => [
      {
        accessorKey: "doctorName",
        header: t("reports.doctorIncome.colDoctor"),
        cell: ({ row }) => <span className="font-medium">{row.original.doctorName}</span>,
      },
      {
        accessorKey: "visitCount",
        header: t("reports.doctorIncome.colVisits"),
        cell: ({ row }) => <span className="tabular-nums">{formatNumber(row.original.visitCount, lang)}</span>,
      },
      {
        accessorKey: "totalRevenue",
        header: t("reports.doctorIncome.colRevenue"),
        cell: ({ row }) => <Money value={row.original.totalRevenue} />,
      },
      {
        accessorKey: "calculatedShare",
        header: t("reports.doctorIncome.colShare"),
        cell: ({ row }) => (
          <span className="font-semibold"><Money value={row.original.calculatedShare} /></span>
        ),
      },
    ],
    [t, lang],
  );

  return (
    <div className="space-y-4">
      <ReportPageHeader titleKey="reports.doctorIncome.title" subtitleKey="reports.doctorIncome.subtitle" />

      <SummaryGrid>
        <SummaryStat label={t("reports.doctorIncome.totalDoctors")} value={formatNumber(query.data?.doctorCount ?? 0, lang)} />
        <SummaryStat label={t("reports.doctorIncome.totalVisits")} value={formatNumber(query.data?.totalVisitCount ?? 0, lang)} />
        <SummaryStat label={t("reports.doctorIncome.totalRevenue")} value={<Money value={query.data?.totalRevenue ?? 0} />} />
        <SummaryStat label={t("reports.doctorIncome.totalShare")} value={<Money value={query.data?.totalCalculatedShare ?? 0} />} tone="teal" />
      </SummaryGrid>

      <ReportFilterBar
        value={period}
        onChange={setPeriod}
        filters={
          <>
            <Select value={doctorId} onChange={(e) => setDoctorId(e.target.value)} containerClassName="w-48">
              <option value="">{t("reports.filters.allDoctors")}</option>
              {doctors.options.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
            <Select value={visitType} onChange={(e) => setVisitType(e.target.value)} containerClassName="w-40">
              <option value="">{t("reports.filters.allTypes")}</option>
              {VISIT_TYPE_VALUES.map((v) => (
                <option key={v} value={v}>
                  {t(`visitType.${v}`)}
                </option>
              ))}
            </Select>
          </>
        }
        actions={<ReportExportButtons path="/reports/doctor-income" params={params} />}
      />

      <DataTable columns={columns} data={rows} isLoading={query.isLoading} emptyMessage={t("reports.doctorIncome.empty")} />
      <Pagination page={page + 1} canPrev={canPrev} canNext={rows.length === take} onPrev={prev} onNext={next} />
    </div>
  );
}
