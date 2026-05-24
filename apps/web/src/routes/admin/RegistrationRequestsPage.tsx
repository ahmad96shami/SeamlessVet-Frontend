import type { ColumnDef } from "@tanstack/react-table";
import {
  formatDate,
  REQUEST_STATUS_VALUES,
  type RegistrationRequestSummary,
} from "@vet/shared";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { DataTable } from "@/components/data-table/DataTable";
import { AdminPage } from "@/components/layout/AdminPage";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  useApproveRegistration,
  useRegistrationRequests,
  useRejectRegistration,
} from "@/queries/registrationRequests";

function statusVariant(status: string): BadgeProps["variant"] {
  if (status === "approved") return "success";
  if (status === "rejected") return "destructive";
  return "warning";
}

type DialogState = { mode: "approve" | "reject"; row: RegistrationRequestSummary } | null;

export function RegistrationRequestsPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [status, setStatus] = useState("pending");
  const [dialog, setDialog] = useState<DialogState>(null);
  const [note, setNote] = useState("");

  const query = useRegistrationRequests(status);
  const approve = useApproveRegistration();
  const reject = useRejectRegistration();

  // Reset the notes field whenever the dialog opens/closes/changes target.
  useEffect(() => setNote(""), [dialog]);

  const columns = useMemo<ColumnDef<RegistrationRequestSummary>[]>(
    () => [
      {
        accessorKey: "fullName",
        header: t("admin.registrations.colName"),
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.original.fullName}</div>
            <div className="text-xs text-muted-foreground" dir="ltr">
              {row.original.phonePrimary}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "requestedRoleKey",
        header: t("admin.registrations.colRole"),
        cell: ({ row }) =>
          t(`roles.${row.original.requestedRoleKey}`, { defaultValue: row.original.requestedRoleKey }),
      },
      {
        accessorKey: "createdAt",
        header: t("admin.registrations.colRequestedAt"),
        cell: ({ row }) => formatDate(row.original.createdAt, lang),
      },
      {
        accessorKey: "status",
        header: t("admin.registrations.colStatus"),
        cell: ({ row }) => (
          <Badge variant={statusVariant(row.original.status)}>
            {t(`requestStatus.${row.original.status}`, { defaultValue: row.original.status })}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) =>
          row.original.status === "pending" ? (
            <div className="flex justify-end gap-2">
              <Button size="sm" onClick={() => setDialog({ mode: "approve", row: row.original })}>
                {t("admin.registrations.approve")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setDialog({ mode: "reject", row: row.original })}
              >
                {t("admin.registrations.reject")}
              </Button>
            </div>
          ) : null,
      },
    ],
    [t, lang],
  );

  const pending = approve.isPending || reject.isPending;
  const rejectInvalid = dialog?.mode === "reject" && note.trim().length === 0;

  const onConfirm = () => {
    if (!dialog) return;
    const onSuccess = (msgKey: string) => () => {
      toast.success(t(msgKey));
      setDialog(null);
    };
    if (dialog.mode === "approve") {
      const trimmed = note.trim();
      approve.mutate(
        { id: dialog.row.id, body: trimmed ? { notes: trimmed } : {} },
        { onSuccess: onSuccess("admin.registrations.approved") },
      );
    } else {
      reject.mutate(
        { id: dialog.row.id, body: { notes: note.trim() } },
        { onSuccess: onSuccess("admin.registrations.rejected") },
      );
    }
  };

  return (
    <AdminPage
      title={t("admin.registrations.title")}
      description={t("admin.registrations.description")}
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Label className="text-muted-foreground">{t("admin.registrations.filterStatus")}</Label>
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            containerClassName="w-44"
          >
            {REQUEST_STATUS_VALUES.map((s) => (
              <option key={s} value={s}>
                {t(`requestStatus.${s}`)}
              </option>
            ))}
          </Select>
        </div>

        <DataTable
          columns={columns}
          data={query.data ?? []}
          isLoading={query.isLoading}
          emptyMessage={t("admin.registrations.empty")}
        />
      </div>

      <Dialog
        open={dialog !== null}
        onClose={() => setDialog(null)}
        title={
          dialog?.mode === "reject"
            ? t("admin.registrations.rejectTitle")
            : t("admin.registrations.approveTitle")
        }
      >
        {dialog ? (
          <div className="space-y-4">
            {dialog.mode === "approve" ? (
              <p className="text-sm text-muted-foreground">
                {t("admin.registrations.approveBody", {
                  role: t(`roles.${dialog.row.requestedRoleKey}`, {
                    defaultValue: dialog.row.requestedRoleKey,
                  }),
                })}
              </p>
            ) : null}
            <div className="space-y-1.5">
              <Label>
                {dialog.mode === "approve"
                  ? t("admin.registrations.notes")
                  : t("admin.registrations.rejectReason")}
              </Label>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} autoFocus />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialog(null)} disabled={pending}>
                {t("admin.common.cancel")}
              </Button>
              <Button onClick={onConfirm} disabled={pending || rejectInvalid}>
                {dialog.mode === "approve"
                  ? t("admin.registrations.approve")
                  : t("admin.registrations.reject")}
              </Button>
            </div>
          </div>
        ) : null}
      </Dialog>
    </AdminPage>
  );
}
