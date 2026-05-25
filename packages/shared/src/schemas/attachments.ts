import { z } from "zod";

import { optionalText } from "./common";

/**
 * Attachment metadata for reads (GET /attachments[/{id}]). `downloadUrl` is a freshly-minted,
 * short-lived (5-min) signed GET URL — present only on the single-resource GET once
 * `uploadStatus = "uploaded"` (null in the list). The raw object key never leaves the server.
 */
export const AttachmentResponseSchema = z.object({
  id: z.string(),
  visitId: z.string(),
  fileType: z.string(),
  title: z.string().nullish(),
  docDate: z.string().nullish(), // DateOnly → "yyyy-MM-dd"
  description: z.string().nullish(),
  uploadStatus: z.string(),
  downloadUrl: z.string().nullish(),
  downloadUrlExpiresAt: z.string().nullish(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type AttachmentResponse = z.infer<typeof AttachmentResponseSchema>;

/**
 * Request a signed PUT URL (POST /attachments/presigned-upload). The wrapper mints the client GUID
 * v7 `id` and sends it so the later confirm can target it (and a retry re-mints a URL, not a dupe).
 * `fileType` ∈ {photo, pdf}. Creates the row with `uploadStatus = "pending"`.
 */
export const PresignedUploadRequestSchema = z.object({
  visitId: z.string().min(1),
  fileType: z.enum(["photo", "pdf"]),
  title: z.string().trim().max(256).optional(),
  docDate: z.string().optional(),
  description: optionalText,
  contentType: z.string().optional(),
});
export type PresignedUploadRequest = z.infer<typeof PresignedUploadRequestSchema>;

/** What the client uploads directly to the private bucket with (`uploadUrl` is a signed PUT). */
export const PresignedUploadResponseSchema = z.object({
  attachmentId: z.string(),
  objectKey: z.string(),
  uploadUrl: z.string(),
  expiresAt: z.string(),
});
export type PresignedUploadResponse = z.infer<typeof PresignedUploadResponseSchema>;

/** Confirm the direct-to-R2 upload (PATCH /attachments/{id}); flips `uploadStatus`. */
export const AttachmentConfirmRequestSchema = z.object({
  uploadStatus: z.enum(["uploaded", "failed"]).optional(),
});
export type AttachmentConfirmRequest = z.infer<typeof AttachmentConfirmRequestSchema>;

export interface AttachmentListParams {
  visitId?: string;
  skip?: number;
  take?: number;
}
