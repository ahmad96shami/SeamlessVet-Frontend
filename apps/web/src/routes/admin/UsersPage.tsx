import type { ColumnDef } from "@tanstack/react-table";
import { ROLE_KEY_VALUES, USER_STATUS_VALUES, type UserResponse } from "@vet/shared";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { DataTable } from "@/components/data-table/DataTable";
import { Pagination } from "@/components/data-table/Pagination";
import { AdminPage } from "@/components/layout/AdminPage";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useOffsetPager } from "@/hooks/useOffsetPager";
import { useDeactivateUser, useReactivateUser, useUsers } from "@/queries/users";
import { useAuthStore } from "@/stores/authStore";
import { UserEditDialog } from "@/routes/admin/UserEditDialog";
import { UserFormDialog } from "@/routes/admin/UserFormDialog";
import { UserPermissionsDialog } from "@/routes/admin/UserPermissionsDialog";
import { UsersTabs } from "@/routes/admin/UsersTabs";

function statusVariant(status: string): BadgeProps["variant"] {
  if (status === "active") return "success";
  if (status === "suspended") return "destructive";
  return "warning";
}

export function UsersPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [permUserId, setPermUserId] = useState<string | null>(null);
  const [editUser, setEditUser] = useState<UserResponse | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const { page, skip, take, canPrev, next, prev, reset } = useOffsetPager(20);

  // Any filter change jumps back to the first page.
  useEffect(() => reset(), [debouncedSearch, role, status, reset]);

  const query = useUsers({
    search: debouncedSearch || undefined,
    role: role || undefined,
    status: status || undefined,
    skip,
    take,
  });
  const rows = query.data ?? [];

  const deactivate = useDeactivateUser();
  const reactivate = useReactivateUser();
  const statusBusy = deactivate.isPending || reactivate.isPending;
  const currentUserId = useAuthStore((s) => s.user?.userId);

  const columns = useMemo<ColumnDef<UserResponse>[]>(
    () => [
      {
        accessorKey: "fullName",
        header: t("admin.users.colName"),
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.original.fullName}</div>
            <div className="text-end text-xs text-muted-foreground" dir="ltr">
              {row.original.phonePrimary}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "roleKey",
        header: t("admin.users.colRole"),
        cell: ({ row }) =>
          t(`roles.${row.original.roleKey}`, { defaultValue: row.original.roleName }),
      },
      {
        accessorKey: "status",
        header: t("admin.users.colStatus"),
        cell: ({ row }) => (
          <Badge variant={statusVariant(row.original.status)}>
            {t(`userStatus.${row.original.status}`, { defaultValue: row.original.status })}
          </Badge>
        ),
      },
      {
        accessorKey: "numberPrefix",
        header: t("admin.users.colPrefix"),
        cell: ({ row }) => (
          <span dir="ltr">{row.original.numberPrefix ?? "—"}</span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const u = row.original;
          // A user can't edit their own permissions (role or overrides) — the server enforces this
          // (cannot_change_own_role / cannot_modify_own_permissions). Hide the overrides action on
          // your own row; the Edit dialog keeps the role picker locked for self.
          const isSelf = u.id === currentUserId;
          return (
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="ghost"
                aria-label={t("admin.common.edit")}
                onClick={() => setEditUser(u)}
              >
                <Icon.edit className="size-4" />
                {t("admin.common.edit")}
              </Button>
              {u.status === "active" ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={statusBusy}
                  onClick={() =>
                    deactivate.mutate(u.id, {
                      onSuccess: () => toast.success(t("admin.users.deactivated")),
                    })
                  }
                >
                  {t("admin.users.deactivate")}
                </Button>
              ) : u.status === "suspended" ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={statusBusy}
                  onClick={() =>
                    reactivate.mutate(u.id, {
                      onSuccess: () => toast.success(t("admin.users.reactivated")),
                    })
                  }
                >
                  {t("admin.users.reactivate")}
                </Button>
              ) : null}
              {isSelf ? null : (
                <Button size="sm" variant="ghost" onClick={() => setPermUserId(u.id)}>
                  <Icon.shield className="size-4" />
                  {t("admin.users.permissions")}
                </Button>
              )}
            </div>
          );
        },
      },
    ],
    [t, statusBusy, deactivate, reactivate, currentUserId],
  );

  return (
    <AdminPage title={t("admin.users.title")} description={t("admin.users.description")}>
      <div className="space-y-4">
        <UsersTabs />
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder={t("admin.users.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <Select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            containerClassName="w-48"
          >
            <option value="">{`${t("admin.users.filterRole")}: ${t("admin.common.all")}`}</option>
            {ROLE_KEY_VALUES.map((r) => (
              <option key={r} value={r}>
                {t(`roles.${r}`)}
              </option>
            ))}
          </Select>
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            containerClassName="w-48"
          >
            <option value="">{`${t("admin.users.filterStatus")}: ${t("admin.common.all")}`}</option>
            {USER_STATUS_VALUES.map((s) => (
              <option key={s} value={s}>
                {t(`userStatus.${s}`)}
              </option>
            ))}
          </Select>
          <Button className="ms-auto" onClick={() => setAddOpen(true)}>
            <Icon.plus className="size-4" />
            {t("admin.users.add")}
          </Button>
        </div>

        <DataTable
          columns={columns}
          data={rows}
          isLoading={query.isLoading}
          emptyMessage={t("admin.common.noResults")}
        />
        <Pagination
          page={page + 1}
          canPrev={canPrev}
          canNext={rows.length === take}
          onPrev={prev}
          onNext={next}
        />
      </div>

      <UserFormDialog open={addOpen} onClose={() => setAddOpen(false)} />
      <UserEditDialog user={editUser} onClose={() => setEditUser(null)} />
      <UserPermissionsDialog userId={permUserId} onClose={() => setPermUserId(null)} />
    </AdminPage>
  );
}
