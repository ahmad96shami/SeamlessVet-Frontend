import type { ColumnDef } from "@tanstack/react-table";
import { formatCurrency, formatDate, type InvoiceResponse } from "@vet/shared";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Money } from "@/components/ui/money";

import { DataTable } from "@/components/data-table/DataTable";
import { Pagination } from "@/components/data-table/Pagination";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useOffsetPager } from "@/hooks/useOffsetPager";
import { useCustomers } from "@/queries/customers";
import { useInvoices } from "@/queries/invoices";

import { InvoiceDetailDialog } from "./InvoiceDetailDialog";
import { invoiceStatusVariant } from "./invoiceStatus";

const STATUSES = ["issued", "void", "flagged"];

/** Invoices history (W6.7) — list/filter, click a row to view + reprint + void. */
export function InvoicesPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const { page, skip, take, canPrev, next, prev, reset } = useOffsetPager(20);
  useEffect(() => reset(), [status, debouncedSearch, reset]);

  const query = useInvoices({
    status: status || undefined,
    search: debouncedSearch.trim() || undefined,
    skip,
    take,
  });
  const rows = query.data ?? [];
  const customers = useCustomers({ take: 200 });
  const customerName = useMemo(
    () => new Map((customers.data ?? []).map((c) => [c.id, c.fullName])),
    [customers.data],
  );
  // Originals that already have a void row on this page → their void action is hidden.
  const voidedIds = useMemo(
    () => new Set(rows.map((r) => r.voidOfInvoiceId).filter((x): x is string => Boolean(x))),
    [rows],
  );
  const [selected, setSelected] = useState<InvoiceResponse | null>(null);

  const columns = useMemo<ColumnDef<InvoiceResponse>[]>(
    () => [
      {
        id: "number",
        header: t("pos.invoices.number"),
        cell: ({ row }) => (
          <span dir="ltr">{row.original.number ?? `#${row.original.id.slice(0, 8)}`}</span>
        ),
      },
      {
        id: "date",
        header: t("pos.invoices.date"),
        cell: ({ row }) => (
          <span dir="ltr">{formatDate(row.original.issuedAt, lang)}</span>
        ),
      },
      {
        id: "type",
        header: t("pos.invoices.type"),
        cell: ({ row }) => (
          <Badge variant="secondary">
            {t(`invoiceType.${row.original.invoiceType}`, { defaultValue: row.original.invoiceType })}
          </Badge>
        ),
      },
      {
        id: "customer",
        header: t("pos.invoices.customer"),
        cell: ({ row }) =>
          row.original.customerId ? (
            (customerName.get(row.original.customerId) ?? "—")
          ) : (
            <span className="text-muted-foreground">{t("pos.invoices.walkIn")}</span>
          ),
      },
      {
        id: "status",
        header: t("pos.invoices.status"),
        cell: ({ row }) => (
          <Badge variant={invoiceStatusVariant(row.original.status)}>
            {t(`invoiceStatus.${row.original.status}`, { defaultValue: row.original.status })}
          </Badge>
        ),
      },
      {
        accessorKey: "total",
        header: t("pos.invoices.total"),
        cell: ({ row }) => (
          <span className="font-medium tabular-nums"><Money value={row.original.total} /></span>
        ),
      },
    ],
    [t, lang, customerName],
  );

  return (
    <div className="mx-auto flex h-full max-w-5xl flex-col gap-4 overflow-auto p-1">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder={t("pos.invoices.searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={status} onChange={(e) => setStatus(e.target.value)} containerClassName="w-52">
          <option value="">{`${t("pos.invoices.filterStatus")}: ${t("pos.invoices.all")}`}</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(`invoiceStatus.${s}`)}
            </option>
          ))}
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={rows}
        isLoading={query.isLoading}
        emptyMessage={t("pos.invoices.empty")}
        onRowClick={setSelected}
      />
      <Pagination
        page={page + 1}
        canPrev={canPrev}
        canNext={rows.length === take}
        onPrev={prev}
        onNext={next}
      />

      {selected ? (
        <InvoiceDetailDialog
          invoice={selected}
          customerName={selected.customerId ? (customerName.get(selected.customerId) ?? null) : null}
          alreadyVoided={voidedIds.has(selected.id)}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </div>
  );
}
