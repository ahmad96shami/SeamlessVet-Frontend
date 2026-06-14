import type { ColumnDef } from "@tanstack/react-table";
import { formatDate, type TenantSummary } from "@vet/shared";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { DataTable } from "@/components/data-table/DataTable";
import { AdminPage } from "@/components/layout/AdminPage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useTenants } from "@/queries/platform";
import { ProvisionTenantDialog } from "@/routes/platform/ProvisionTenantDialog";
import { tenantStatusVariant } from "@/routes/platform/tenantStatus";

/** The platform console's centers list (W25): search/filter, click a row → detail, provision a new one. */
export function PlatformTenantsPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const navigate = useNavigate();
  const query = useTenants();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [provisionOpen, setProvisionOpen] = useState(false);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (query.data ?? []).filter(
      (tnt) =>
        (!status || tnt.status === status) &&
        (!term || tnt.name.toLowerCase().includes(term) || tnt.code.toLowerCase().includes(term)),
    );
  }, [query.data, search, status]);

  const columns = useMemo<ColumnDef<TenantSummary>[]>(
    () => [
      {
        accessorKey: "name",
        header: t("platform.tenants.colName"),
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      {
        accessorKey: "code",
        header: t("platform.tenants.colCode"),
        cell: ({ row }) => (
          <span className="font-mono text-xs" dir="ltr">
            {row.original.code}
          </span>
        ),
      },
      {
        accessorKey: "mode",
        header: t("platform.tenants.colMode"),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {t(`platform.mode.${row.original.mode}`, { defaultValue: row.original.mode })}
          </span>
        ),
      },
      {
        accessorKey: "userCount",
        header: t("platform.tenants.colUsers"),
        cell: ({ row }) => (
          <span dir="ltr">{row.original.userCount}</span>
        ),
      },
      {
        accessorKey: "createdAt",
        header: t("platform.tenants.colCreated"),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground" dir="ltr">
            {formatDate(row.original.createdAt, lang)}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: t("platform.tenants.colStatus"),
        cell: ({ row }) => (
          <Badge variant={tenantStatusVariant(row.original.status)}>
            {t(`platform.status.${row.original.status}`, { defaultValue: row.original.status })}
          </Badge>
        ),
      },
    ],
    [t, lang],
  );

  return (
    <AdminPage
      title={t("platform.tenants.title")}
      description={t("platform.tenants.description")}
      actions={
        <Button onClick={() => setProvisionOpen(true)}>
          <Icon.plus className="size-4" />
          {t("platform.tenants.new")}
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder={t("platform.tenants.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <Select value={status} onChange={(e) => setStatus(e.target.value)} containerClassName="w-44">
            <option value="">{`${t("platform.tenants.filterStatus")}: ${t("admin.common.all")}`}</option>
            <option value="active">{t("platform.status.active")}</option>
            <option value="suspended">{t("platform.status.suspended")}</option>
          </Select>
        </div>

        <DataTable
          columns={columns}
          data={rows}
          isLoading={query.isLoading}
          emptyMessage={t("platform.tenants.empty")}
          onRowClick={(tnt) => navigate(`/platform/tenants/${tnt.id}`)}
        />
      </div>

      <ProvisionTenantDialog open={provisionOpen} onClose={() => setProvisionOpen(false)} />
    </AdminPage>
  );
}
