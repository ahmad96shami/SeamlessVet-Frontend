import type { ColumnDef } from "@tanstack/react-table";
import { type RoleListItem } from "@vet/shared";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { DataTable } from "@/components/data-table/DataTable";
import { AdminPage } from "@/components/layout/AdminPage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { useDeleteRole, useRoles } from "@/queries/roles";
import { RoleFormDialog } from "@/routes/admin/RoleFormDialog";
import { UsersTabs } from "@/routes/admin/UsersTabs";

const ADMIN_KEY = "admin";

export function RolesPage() {
  const { t } = useTranslation();
  const query = useRoles();
  const rows = query.data ?? [];
  const del = useDeleteRole();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RoleListItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RoleListItem | null>(null);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (r: RoleListItem) => {
    setEditing(r);
    setFormOpen(true);
  };

  const label = (r: RoleListItem) =>
    r.isBuiltIn ? t(`roles.${r.key}`, { defaultValue: r.name }) : r.name;

  const columns = useMemo<ColumnDef<RoleListItem>[]>(
    () => [
      {
        accessorKey: "name",
        header: t("admin.roles.colName"),
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span className="font-medium">{label(row.original)}</span>
            {row.original.isBuiltIn ? (
              <Badge variant="secondary">{t("admin.roles.builtIn")}</Badge>
            ) : (
              <Badge variant="success">{t("admin.roles.custom")}</Badge>
            )}
          </div>
        ),
      },
      {
        id: "permissions",
        header: t("admin.roles.colPermissions"),
        cell: ({ row }) =>
          row.original.key === ADMIN_KEY ? (
            <span className="text-sm text-muted-foreground">{t("admin.roles.allPermissions")}</span>
          ) : (
            <span className="text-sm">{t("admin.roles.permCount", { count: row.original.permissions.length })}</span>
          ),
      },
      {
        accessorKey: "userCount",
        header: t("admin.roles.colUsers"),
        cell: ({ row }) => <span className="tabular-nums">{row.original.userCount}</span>,
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const r = row.original;
          const isAdmin = r.key === ADMIN_KEY;
          const canDelete = !r.isBuiltIn && r.userCount === 0;
          return (
            <div className="flex justify-end gap-1">
              {!isAdmin ? (
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={t("admin.common.edit")}
                  onClick={() => openEdit(r)}
                >
                  <Icon.edit className="size-4" />
                </Button>
              ) : null}
              {canDelete ? (
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={t("admin.common.delete")}
                  onClick={() => setDeleteTarget(r)}
                >
                  <Icon.trash className="size-4 text-destructive" />
                </Button>
              ) : null}
            </div>
          );
        },
      },
    ],
    [t],
  );

  const confirmDelete = () => {
    if (!deleteTarget) return;
    del.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success(t("admin.common.deleted"));
        setDeleteTarget(null);
      },
      onError: (e) => toast.error(e.message),
    });
  };

  return (
    <AdminPage
      title={t("admin.roles.title")}
      description={t("admin.roles.description")}
      actions={
        <Button onClick={openCreate}>
          <Icon.plus className="size-4" />
          {t("admin.roles.new")}
        </Button>
      }
    >
      <div className="space-y-4">
        <UsersTabs />
        <DataTable
          columns={columns}
          data={rows}
          isLoading={query.isLoading}
          emptyMessage={t("admin.common.noResults")}
        />
      </div>

      <RoleFormDialog open={formOpen} role={editing} onClose={() => setFormOpen(false)} />

      <Dialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title={t("admin.common.deleteConfirmTitle")}
      >
        {deleteTarget ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t("admin.roles.deleteConfirm", { name: label(deleteTarget) })}
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={del.isPending}>
                {t("admin.common.cancel")}
              </Button>
              <Button variant="destructive" onClick={confirmDelete} disabled={del.isPending}>
                {t("admin.common.delete")}
              </Button>
            </div>
          </div>
        ) : null}
      </Dialog>
    </AdminPage>
  );
}
