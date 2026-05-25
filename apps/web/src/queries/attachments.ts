import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  confirmAttachment,
  deleteAttachment,
  getAttachment,
  listAttachments,
  presignAttachmentUpload,
  type ApiError,
  type AttachmentResponse,
} from "@vet/shared";

import { apiClient } from "@/services/apiClient";

const KEY = "attachments";

export function useAttachments(visitId: string | null) {
  return useQuery<AttachmentResponse[], ApiError>({
    queryKey: [KEY, visitId],
    queryFn: () => listAttachments(apiClient, { visitId: visitId as string, take: 200 }),
    enabled: visitId !== null,
  });
}

export interface UploadAttachmentInput {
  visitId: string;
  file: File;
  fileType: "photo" | "pdf";
  title?: string;
  docDate?: string;
  description?: string;
}

/**
 * The three-leg attachment upload: presign (our API) → PUT the bytes straight to R2 (a raw fetch,
 * not our client) → confirm (our API). Throws if any leg fails; the caller surfaces it.
 */
export function useUploadAttachment() {
  const qc = useQueryClient();
  return useMutation<string, Error, UploadAttachmentInput>({
    mutationFn: async ({ visitId, file, fileType, title, docDate, description }) => {
      const presign = await presignAttachmentUpload(apiClient, {
        visitId,
        fileType,
        title,
        docDate,
        description,
        contentType: file.type || undefined,
      });
      const put = await fetch(presign.uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type || "application/octet-stream" },
      });
      if (!put.ok) throw new Error(`R2 upload failed (HTTP ${put.status})`);
      await confirmAttachment(apiClient, presign.attachmentId, { uploadStatus: "uploaded" });
      return presign.attachmentId;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useDeleteAttachment() {
  const qc = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => deleteAttachment(apiClient, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

/** Fetch a fresh short-lived signed GET URL for viewing/downloading an uploaded attachment. */
export async function fetchAttachmentUrl(id: string): Promise<string | null> {
  const att = await getAttachment(apiClient, id);
  return att.downloadUrl ?? null;
}
