import { formatDate, type AttachmentResponse } from "@vet/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { fetchAttachmentUrl, useAttachments, useDeleteAttachment } from "@/queries/attachments";
import { AttachmentUploadDialog } from "@/routes/visits/AttachmentUploadDialog";

function statusVariant(status: string): BadgeProps["variant"] {
  if (status === "uploaded") return "success";
  if (status === "failed") return "destructive";
  return "secondary"; // pending
}

/** Visit attachments (PRD §5.2-F) — presigned upload to R2 + signed-GET viewing. */
export function AttachmentsTab({ visitId, readOnly }: { visitId: string; readOnly: boolean }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const query = useAttachments(visitId);
  const rows = query.data ?? [];
  const del = useDeleteAttachment();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AttachmentResponse | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);

  const onView = async (a: AttachmentResponse) => {
    if (a.uploadStatus !== "uploaded") {
      toast.message(t("visits.files.pendingHint"));
      return;
    }
    setViewing(a.id);
    try {
      const url = await fetchAttachmentUrl(a.id);
      if (url) window.open(url, "_blank", "noopener");
      else toast.message(t("visits.files.pendingHint"));
    } catch {
      toast.error(t("visits.files.pendingHint"));
    } finally {
      setViewing(null);
    }
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    del.mutate(deleteTarget.id, {
      onSuccess: () => { toast.success(t("admin.common.deleted")); setDeleteTarget(null); },
    });
  };

  return (
    <section className="space-y-3">
      {!readOnly ? (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setUploadOpen(true)}>
            <Icon.upload className="size-4" />
            {t("visits.files.add")}
          </Button>
        </div>
      ) : null}

      {query.isLoading ? (
        <div className="grid h-24 place-items-center rounded-2xl border">
          <Icon.spinner className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : rows.length === 0 ? (
        <div className="grid h-24 place-items-center rounded-2xl border text-sm text-muted-foreground">
          {t("visits.files.empty")}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((a) => {
            const FileIcon = a.fileType === "pdf" ? Icon.paper : Icon.image;
            return (
              <div key={a.id} className="flex gap-3 rounded-2xl border p-3">
                <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-ink-50 text-navy-900">
                  <FileIcon className="size-5" />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium">
                      {a.title || t(`attachmentType.${a.fileType}`, { defaultValue: a.fileType })}
                    </span>
                    <Badge variant={statusVariant(a.uploadStatus)}>
                      {t(`uploadStatus.${a.uploadStatus}`, { defaultValue: a.uploadStatus })}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t(`attachmentType.${a.fileType}`, { defaultValue: a.fileType })}
                    {a.docDate ? <span dir="ltr"> · {formatDate(a.docDate, lang)}</span> : null}
                  </div>
                  <div className="flex items-center gap-1 pt-1">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => onView(a)}
                      disabled={viewing === a.id || a.uploadStatus !== "uploaded"}
                    >
                      <Icon.search className="size-3.5" />
                      {t("visits.files.view")}
                    </Button>
                    {!readOnly ? (
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={t("admin.common.delete")}
                        onClick={() => setDeleteTarget(a)}
                      >
                        <Icon.trash className="size-4 text-destructive" />
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {uploadOpen ? (
        <AttachmentUploadDialog open visitId={visitId} onClose={() => setUploadOpen(false)} />
      ) : null}

      <Dialog open={deleteTarget !== null} onClose={() => setDeleteTarget(null)} title={t("admin.common.deleteConfirmTitle")}>
        {deleteTarget ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{t("visits.files.deleteConfirm")}</p>
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
    </section>
  );
}
