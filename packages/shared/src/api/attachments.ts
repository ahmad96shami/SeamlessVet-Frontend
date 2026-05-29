import type { AxiosInstance } from "axios";
import { z } from "zod";

import { newGuidV7 } from "../http/idempotency";
import { IdentifierResponseSchema, type IdentifierResponse } from "../schemas/common";
import {
  AttachmentConfirmRequestSchema,
  AttachmentResponseSchema,
  PresignedUploadRequestSchema,
  PresignedUploadResponseSchema,
  type AttachmentConfirmRequest,
  type AttachmentListParams,
  type AttachmentResponse,
  type PresignedUploadRequest,
  type PresignedUploadResponse,
} from "../schemas/attachments";

const AttachmentListSchema = z.array(AttachmentResponseSchema);

/** GET /attachments — offset-paged metadata (no download URLs in the list); filter by visitId. */
export async function listAttachments(
  client: AxiosInstance,
  params?: AttachmentListParams,
): Promise<AttachmentResponse[]> {
  const res = await client.get("/attachments", { params });
  return AttachmentListSchema.parse(res.data);
}

/** GET /attachments/{id} — single attachment with a fresh short-lived signed `downloadUrl`. */
export async function getAttachment(client: AxiosInstance, id: string): Promise<AttachmentResponse> {
  const res = await client.get(`/attachments/${id}`);
  return AttachmentResponseSchema.parse(res.data);
}

/**
 * POST /attachments/presigned-upload — returns a signed PUT URL for direct-to-R2 upload, then
 * confirm via {@link confirmAttachment}. Re-requesting for an existing id re-mints a URL (safe
 * retry).
 *
 * `id` defaults to a fresh client GUID v7 (the web one-shot path), but a caller that needs the id
 * up-front — the mobile offline outbox, which persists the attachment id with the captured file so
 * a reconnect re-presigns the **same** row instead of creating a duplicate — passes its own
 * pre-minted id.
 */
export async function presignAttachmentUpload(
  client: AxiosInstance,
  body: PresignedUploadRequest,
  id: string = newGuidV7(),
): Promise<PresignedUploadResponse> {
  const payload = PresignedUploadRequestSchema.parse(body);
  const res = await client.post("/attachments/presigned-upload", { ...payload, id });
  return PresignedUploadResponseSchema.parse(res.data);
}

/** PATCH /attachments/{id} — confirm the direct-to-R2 upload (records the key, flips status). */
export async function confirmAttachment(
  client: AxiosInstance,
  id: string,
  body: AttachmentConfirmRequest = {},
): Promise<IdentifierResponse> {
  const payload = AttachmentConfirmRequestSchema.parse(body);
  const res = await client.patch(`/attachments/${id}`, payload);
  return IdentifierResponseSchema.parse(res.data);
}

/** DELETE /attachments/{id} — soft delete. */
export async function deleteAttachment(client: AxiosInstance, id: string): Promise<void> {
  await client.delete(`/attachments/${id}`);
}
