import type { ColumnDef } from "@tanstack/react-table";
import { formatDate, type CustomerResponse, type UpcomingVaccinationRow } from "@vet/shared";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { DataTable } from "@/components/data-table/DataTable";
import { Pagination } from "@/components/data-table/Pagination";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useCustomerLookup } from "@/hooks/useCustomerLookup";
import { useOffsetPager } from "@/hooks/useOffsetPager";
import { useUpcomingVaccinations } from "@/queries/reports";
import { CustomerPickerDialog } from "@/routes/pos/CustomerPickerDialog";
import { DEFAULT_PERIOD, resolvePeriod, type PeriodValue } from "@/routes/reports/period";
import { ReportExportButtons } from "@/routes/reports/ReportExportButtons";
import { ReportFilterBar } from "@/routes/reports/ReportFilterBar";
import { ReportPageHeader } from "@/routes/reports/ReportPageHeader";

export function UpcomingVaccinationsPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  // "Upcoming" = forward-looking, but the shared presets are backward-looking; default to all so every
  // due vaccination shows, then let the user narrow (custom range / this month) as needed.
  const [period, setPeriod] = useState<PeriodValue>({ ...DEFAULT_PERIOD, preset: "all" });
  const [customer, setCustomer] = useState<CustomerResponse | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const { page, skip, take, canPrev, next, prev, reset } = useOffsetPager(20);
  const range = useMemo(() => resolvePeriod(period), [period]);

  useEffect(() => reset(), [period, customer, reset]);

  const customers = useCustomerLookup();
  const params = { ...range, customerId: customer?.id || undefined };
  const query = useUpcomingVaccinations({ ...params, skip, take });
  const rows = query.data?.rows ?? [];

  const columns = useMemo<ColumnDef<UpcomingVaccinationRow>[]>(
    () => [
      {
        accessorKey: "vaccineType",
        header: t("reports.vaccinations.colVaccine"),
        cell: ({ row }) => <span className="font-medium">{row.original.vaccineType}</span>,
      },
      {
        accessorKey: "customerId",
        header: t("reports.vaccinations.colCustomer"),
        cell: ({ row }) =>
          row.original.customerId ? (customers.byId.get(row.original.customerId)?.fullName ?? "—") : "—",
      },
      {
        accessorKey: "dateGiven",
        header: t("reports.vaccinations.colGiven"),
        cell: ({ row }) => formatDate(row.original.dateGiven, lang),
      },
      {
        accessorKey: "nextDueDate",
        header: t("reports.vaccinations.colDue"),
        cell: ({ row }) =>
          row.original.nextDueDate ? formatDate(row.original.nextDueDate, lang) : "—",
      },
    ],
    [t, lang, customers.byId],
  );

  return (
    <div className="space-y-4">
      <ReportPageHeader titleKey="reports.vaccinations.title" subtitleKey="reports.vaccinations.subtitle" />

      <ReportFilterBar
        value={period}
        onChange={setPeriod}
        filters={
          <div className="flex items-center gap-1">
            <Button variant="outline" onClick={() => setPickerOpen(true)}>
              <Icon.search className="size-4" />
              {customer ? customer.fullName : t("reports.filters.allCustomers")}
            </Button>
            {customer ? (
              <Button variant="ghost" size="icon" aria-label={t("reports.filters.allCustomers")} onClick={() => setCustomer(null)}>
                <Icon.close className="size-4" />
              </Button>
            ) : null}
          </div>
        }
        actions={<ReportExportButtons path="/reports/upcoming-vaccinations" params={params} />}
      />

      <DataTable columns={columns} data={rows} isLoading={query.isLoading} emptyMessage={t("reports.vaccinations.empty")} />
      <Pagination page={page + 1} canPrev={canPrev} canNext={rows.length === take} onPrev={prev} onNext={next} />

      <CustomerPickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(c) => {
          setCustomer(c);
          setPickerOpen(false);
        }}
      />
    </div>
  );
}
