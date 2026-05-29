import { newGuidV7 } from "@vet/shared";

import { prefs } from "@/services/mmkv";

/**
 * One captured-but-not-yet-uploaded attachment. PRD §8.8: file attachments are **never** stored in
 * the offline DB — only the **local file URI** (a pointer to the OS file the camera/gallery wrote)
 * lives here, in MMKV, alongside the metadata. The bytes stay on disk until the upload engine
 * presigns → PUTs them to R2 → confirms, after which the server owns the row (PowerSync streams it
 * back down) and the outbox entry is removed.
 *
 * `id` is the **client-minted attachment id** (GUID v7) — the same id the presign call uses, so a
 * reconnect re-presigns the same row instead of duplicating. Lifecycle statuses mirror the REST
 * queue ({@link offlineQueue}): `pending` → `failed` (transient, auto-retried) | `conflict`
 * (server rejected — surfaced for the doctor, never silently dropped).
 */
export type AttachmentOutboxStatus = "pending" | "failed" | "conflict";

export interface AttachmentOutboxItem {
  id: string;
  visitId: string;
  /** `file://…` URI of the captured photo on the device (NOT the bytes). */
  localUri: string;
  fileType: "photo" | "pdf";
  contentType?: string;
  title?: string;
  /** `yyyy-MM-dd`. */
  docDate?: string;
  description?: string;
  status: AttachmentOutboxStatus;
  attempts: number;
  createdAt: string;
  lastError?: string;
  lastCode?: string;
}

/** What capture supplies; the outbox fills in id/createdAt/attempts/status. */
export type AttachmentDraft = Pick<AttachmentOutboxItem, "visitId" | "localUri" | "fileType"> &
  Partial<Pick<AttachmentOutboxItem, "contentType" | "title" | "docDate" | "description">>;

const KEY = "attachmentOutbox:v1";
const REPLAYABLE: ReadonlySet<AttachmentOutboxStatus> = new Set(["pending", "failed"]);

function readAll(): AttachmentOutboxItem[] {
  const json = prefs.getString(KEY);
  if (!json) return [];
  try {
    const parsed = JSON.parse(json) as unknown;
    return Array.isArray(parsed) ? (parsed as AttachmentOutboxItem[]) : [];
  } catch {
    return [];
  }
}

function writeAll(items: AttachmentOutboxItem[]): void {
  prefs.set(KEY, JSON.stringify(items));
}

function byCreatedAt(a: AttachmentOutboxItem, b: AttachmentOutboxItem): number {
  return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0;
}

/** Capture → outbox. Returns the new item (its `id` is the eventual attachment id). */
export function enqueueAttachment(draft: AttachmentDraft): AttachmentOutboxItem {
  const item: AttachmentOutboxItem = {
    id: newGuidV7(),
    visitId: draft.visitId,
    localUri: draft.localUri,
    fileType: draft.fileType,
    contentType: draft.contentType,
    title: draft.title,
    docDate: draft.docDate,
    description: draft.description,
    status: "pending",
    attempts: 0,
    createdAt: new Date().toISOString(),
  };
  writeAll([...readAll(), item]);
  return item;
}

export function listAttachmentOutbox(): AttachmentOutboxItem[] {
  return readAll().sort(byCreatedAt);
}

/** Outbox entries for one visit (merged with synced rows in the visit's attachments list). */
export function listAttachmentOutboxForVisit(visitId: string): AttachmentOutboxItem[] {
  return readAll()
    .filter((i) => i.visitId === visitId)
    .sort(byCreatedAt);
}

/** Items eligible to (re)upload now — `pending` + (transiently) `failed`, oldest-first. */
export function replayableAttachments(): AttachmentOutboxItem[] {
  return readAll()
    .filter((i) => REPLAYABLE.has(i.status))
    .sort(byCreatedAt);
}

export function countAttachmentOutbox(): number {
  return readAll().length;
}

export function countAttachmentConflicts(): number {
  return readAll().filter((i) => i.status === "conflict").length;
}

function update(id: string, patch: Partial<AttachmentOutboxItem>): void {
  writeAll(readAll().map((i) => (i.id === id ? { ...i, ...patch } : i)));
}

function bumpAttempts(id: string): number {
  return (readAll().find((i) => i.id === id)?.attempts ?? 0) + 1;
}

export function markAttachmentFailed(id: string, error: string): void {
  update(id, { status: "failed", lastError: error, attempts: bumpAttempts(id) });
}

export function markAttachmentConflict(id: string, code: string | undefined, error: string): void {
  update(id, { status: "conflict", lastCode: code, lastError: error, attempts: bumpAttempts(id) });
}

/** Re-arm a failed/conflict item for re-upload (user hit "retry"). */
export function retryAttachmentItem(id: string): void {
  update(id, { status: "pending" });
}

/** Uploaded OK (or the user discarded) → drop it. */
export function removeAttachment(id: string): void {
  writeAll(readAll().filter((i) => i.id !== id));
}

export function clearAttachmentOutbox(): void {
  prefs.remove(KEY);
}
