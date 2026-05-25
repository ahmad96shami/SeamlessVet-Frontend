import { ATTACHMENT_TYPE_VALUES } from "@vet/shared";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Field } from "@/components/form/Field";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useUploadAttachment } from "@/queries/attachments";

type FileType = "photo" | "pdf";

/** Upload an attachment: pick a file (+ metadata) → presign → PUT to R2 → confirm. */
export function AttachmentUploadDialog({
  open,
  visitId,
  onClose,
}: {
  open: boolean;
  visitId: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const upload = useUploadAttachment();

  const [file, setFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<FileType>("photo");
  const [title, setTitle] = useState("");
  const [docDate, setDocDate] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!open) return;
    setFile(null);
    setFileType("photo");
    setTitle("");
    setDocDate("");
    setDescription("");
  }, [open]);

  const onPickFile = (f: File | null) => {
    setFile(f);
    if (f) setFileType(f.type === "application/pdf" ? "pdf" : "photo");
  };

  const onSubmit = () => {
    if (!file) return;
    upload.mutate(
      {
        visitId,
        file,
        fileType,
        title: title.trim() || undefined,
        docDate: docDate || undefined,
        description: description.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success(t("visits.files.uploaded"));
          onClose();
        },
        onError: (e) => toast.error(e.message),
      },
    );
  };

  return (
    <Dialog open={open} onClose={onClose} title={t("visits.files.newTitle")}>
      <div className="space-y-4">
        <Field label={t("visits.files.file")}>
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm file:me-3 file:rounded-md file:border-0 file:bg-ink-50 file:px-3 file:py-2 file:text-sm file:font-bold file:text-navy-900 hover:file:bg-ink-100"
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("visits.files.fileType")}>
            <select
              className="select appearance-none"
              value={fileType}
              onChange={(e) => setFileType(e.target.value as FileType)}
            >
              {ATTACHMENT_TYPE_VALUES.map((ft) => (
                <option key={ft} value={ft}>
                  {t(`attachmentType.${ft}`)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("visits.files.docDate")}>
            <Input type="date" dir="ltr" value={docDate} onChange={(e) => setDocDate(e.target.value)} />
          </Field>
        </div>
        <Field label={t("visits.files.fileTitle")}>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label={t("visits.files.description")}>
          <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={upload.isPending}>
            {t("admin.common.cancel")}
          </Button>
          <Button onClick={onSubmit} disabled={!file || upload.isPending}>
            {upload.isPending ? t("visits.files.uploading") : t("visits.files.add")}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
