import { formatDate, type FieldVisitRow } from "@vet/shared";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { useCustomerLookup } from "@/hooks/useCustomerLookup";
import { useDoctorOptions } from "@/hooks/useDoctorOptions";
import { useFieldDoctorVisits } from "@/queries/reports";
import { DEFAULT_PERIOD, resolvePeriod, type PeriodValue } from "@/routes/reports/period";
import { ReportExportButtons } from "@/routes/reports/ReportExportButtons";
import { ReportFilterBar } from "@/routes/reports/ReportFilterBar";
import { ReportPageHeader } from "@/routes/reports/ReportPageHeader";

const STATUS_VARIANT: Record<string, "success" | "destructive" | "warning" | "secondary"> = {
  completed: "success",
  cancelled: "destructive",
  in_progress: "warning",
  open: "secondary",
};

export function FieldVisitsPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [period, setPeriod] = useState<PeriodValue>(DEFAULT_PERIOD);
  const [doctorId, setDoctorId] = useState("");
  const range = useMemo(() => resolvePeriod(period), [period]);

  const doctors = useDoctorOptions();
  const customers = useCustomerLookup();
  const params = { ...range, doctorId: doctorId || undefined };
  const query = useFieldDoctorVisits(params);
  const rows: FieldVisitRow[] = query.data?.pages.flatMap((p) => p.rows) ?? [];
  const total = query.data?.pages[0]?.totalCount ?? 0;

  return (
    <div className="space-y-4">
      <ReportPageHeader titleKey="reports.fieldVisits.title" subtitleKey="reports.fieldVisits.subtitle" />

      <ReportFilterBar
        value={period}
        onChange={setPeriod}
        filters={
          <Select value={doctorId} onChange={(e) => setDoctorId(e.target.value)} containerClassName="w-48">
            <option value="">{t("reports.filters.allDoctors")}</option>
            {doctors.options.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
        }
        actions={<ReportExportButtons path="/reports/field-doctor-visits" params={params} />}
      />

      {rows.length > 0 ? (
        <span className="cap-12 text-muted-foreground">{t("reports.fieldVisits.totalCount", { count: total })}</span>
      ) : null}

      <div className="card flush overflow-hidden">
        <table className="tbl">
          <thead>
            <tr>
              <th>{t("reports.fieldVisits.colVisit")}</th>
              <th>{t("reports.fieldVisits.colDoctor")}</th>
              <th>{t("reports.fieldVisits.colCustomer")}</th>
              <th>{t("reports.fieldVisits.colDate")}</th>
              <th>{t("reports.fieldVisits.colStatus")}</th>
              <th>{t("reports.fieldVisits.services")}</th>
              <th>{t("reports.fieldVisits.medications")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((v) => (
              <tr key={v.visitId}>
                <td className="t-mono">{v.visitNumber ?? v.visitId.slice(0, 8)}</td>
                <td>{doctors.byId.get(v.doctorId) ?? "—"}</td>
                <td>{customers.byId.get(v.customerId)?.fullName ?? "—"}</td>
                <td>{v.startedAt ? formatDate(v.startedAt, lang) : t("reports.fieldVisits.none")}</td>
                <td>
                  <Badge variant={STATUS_VARIANT[v.status] ?? "secondary"}>
                    {t(`visitStatus.${v.status}`, { defaultValue: v.status })}
                  </Badge>
                </td>
                <td>{v.services.length > 0 ? v.services.map((s) => s.serviceName ?? "—").join("، ") : t("reports.fieldVisits.none")}</td>
                <td>{v.medications.length > 0 ? v.medications.map((m) => m.productName ?? "—").join("، ") : t("reports.fieldVisits.none")}</td>
              </tr>
            ))}
            {rows.length === 0 && !query.isLoading ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                  {t("reports.fieldVisits.empty")}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {query.hasNextPage ? (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => query.fetchNextPage()} disabled={query.isFetchingNextPage}>
            {query.isFetchingNextPage ? t("reports.common.loading") : t("reports.fieldVisits.loadMore")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
