import { FileSystemUploadType, uploadAsync } from "expo-file-system/legacy";
import { classifyReplay, confirmAttachment, presignAttachmentUpload } from "@vet/shared";

import { apiClient } from "@/services/apiClient";
import {
  type AttachmentOutboxItem,
  countAttachmentConflicts,
  countAttachmentOutbox,
  markAttachmentConflict,
  markAttachmentFailed,
  removeAttachment,
  replayableAttachments,
  retryAttachmentItem,
} from "@/services/attachmentOutbox";
import { useSyncStore } from "@/stores/syncStore";
import { powerSync } from "@/sync/database";

/**
 * The attachment upload outbox's drain driver — the third leg of the hybrid write model, beside
 * PowerSync CRUD and the shared REST-intent queue. It runs the three-leg upload PRD §5.2-F / web W4
 * proved: presign (our API, mints/targets the stable attachment id) → PUT the bytes **straight to
 * R2** (a raw signed PUT, never through our API) → confirm (our API; flips `upload_status`). On
 * success the server owns the row and PowerSync streams it back down, so we drop the outbox entry.
 *
 * Online is proxied by PowerSync's connection status (same as the REST engine — no netinfo dep).
 * Classification mirrors the queues: a 4xx from presign/confirm is a *conflict* (parked, surfaced);
 * anything else (offline, 5xx, a non-2xx R2 PUT, an expired signed URL) is *transient* (re-presigned
 * on the next drain). Like the REST drain we stop at the first transient error and resume on
 * reconnect; conflicts don't block the rest.
 */

const isOnline = (): boolean => powerSync.currentStatus.connected;

let draining = false;

/** Push the live outbox counts into the unified sync surface. */
export function refreshAttachmentCounts(): void {
  useSyncStore.getState().set({
    attPendingCount: countAttachmentOutbox(),
    attConflictCount: countAttachmentConflicts(),
  });
}

async function uploadOne(item: AttachmentOutboxItem): Promise<void> {
  const presign = await presignAttachmentUpload(
    apiClient,
    {
      visitId: item.visitId,
      fileType: item.fileType,
      title: item.title,
      docDate: item.docDate,
      description: item.description,
      contentType: item.contentType,
    },
    item.id,
  );

  const put = await uploadAsync(presign.uploadUrl, item.localUri, {
    httpMethod: "PUT",
    uploadType: FileSystemUploadType.BINARY_CONTENT,
    headers: { "Content-Type": item.contentType ?? "application/octet-stream" },
  });
  if (put.status < 200 || put.status >= 300) {
    // R2 rejected the bytes (expired URL, network) — transient; re-presign next drain.
    throw new Error(`R2 upload failed (HTTP ${put.status})`);
  }

  await confirmAttachment(apiClient, presign.attachmentId, { uploadStatus: "uploaded" });
  removeAttachment(item.id); // server owns the row now; PowerSync re-streams it as a synced row.
}

/**
 * Drain the attachment outbox (no-op if already draining or offline). Oldest-first; stop at the
 * first transient failure, continue past a conflict. Decoupled from the REST `syncNow` loop so a
 * slow photo upload never stalls the (small, fast) REST-intent drain.
 */
export async function drainAttachmentOutbox(): Promise<void> {
  if (draining || !isOnline()) {
    refreshAttachmentCounts();
    return;
  }
  draining = true;
  try {
    for (const item of replayableAttachments()) {
      if (!isOnline()) break;
      try {
        await uploadOne(item);
      } catch (err) {
        const classified = classifyReplay(err);
        if (classified.outcome === "conflict") {
          markAttachmentConflict(item.id, classified.code, classified.message);
          continue; // a permanent rejection of one file; others can still upload.
        }
        markAttachmentFailed(item.id, classified.message);
        break; // transient — stop; the next reconnect resumes from here.
      } finally {
        refreshAttachmentCounts();
      }
    }
  } finally {
    draining = false;
    refreshAttachmentCounts();
  }
}

/** Re-arm one parked/failed attachment and drain (Mo6.4's per-item "retry"). */
export async function retryAttachment(id: string): Promise<void> {
  retryAttachmentItem(id);
  refreshAttachmentCounts();
  void drainAttachmentOutbox();
}

/** Discard one captured attachment (user chose to drop it) — behind a confirm in the UI. */
export function discardAttachment(id: string): void {
  removeAttachment(id);
  refreshAttachmentCounts();
}
