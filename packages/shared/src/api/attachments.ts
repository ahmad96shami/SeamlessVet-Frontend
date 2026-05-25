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
 * POST /attachments/presigned-upload — mints the client GUID v7 attachment `id` and returns a
 * signed PUT URL. The browser then uploads the file directly to R2 with that URL, and confirms via
 * {@link confirmAttachment}. Re-requesting for an existing id re-mints a URL (safe retry).
 */
export async function presignAttachmentUpload(
  client: AxiosInstance,
  body: PresignedUploadRequest,
): Promise<PresignedUploadResponse> {
  const payload = PresignedUploadRequestSchema.parse(body);
  const res = await client.post("/attachments/presigned-upload", { ...payload, id: newGuidV7() });
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
