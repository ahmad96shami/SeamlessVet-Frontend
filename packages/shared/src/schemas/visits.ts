import { z } from "zod";

import { optionalText } from "./common";

/**
 * A visit row (GET /visits[/{id}]). Serves both in-clinic and field encounters. All clinical
 * sections live on this one record (assessment + diagnosis); procedures / prescriptions /
 * follow-ups / vaccinations / attachments are child collections with their own endpoints.
 * `visitNumber` is nullable — web-created visits leave it null (the per-user `{prefix}-{seq}`
 * scheme needs a prefix source the web doesn't have; multiple NULLs are fine under the unique index).
 * `batchId` / `contractId` are M8 fields, read-only here.
 */
export const VisitResponseSchema = z.object({
  id: z.string(),
  visitType: z.string(),
  visitNumber: z.string().nullish(),
  customerId: z.string(),
  petId: z.string().nullish(),
  batchId: z.string().nullish(),
  contractId: z.string().nullish(),
  doctorId: z.string(),
  receptionistId: z.string().nullish(),
  status: z.string(),
  startedAt: z.string().nullish(),
  endedAt: z.string().nullish(),
  // A. initial assessment
  chiefComplaint: z.string().nullish(),
  symptoms: z.string().nullish(),
  temperature: z.number().nullish(),
  heartRate: z.number().nullish(),
  respiratoryRate: z.number().nullish(),
  weight: z.number().nullish(),
  clinicalNotes: z.string().nullish(),
  // B. diagnosis
  preliminaryDiagnosis: z.string().nullish(),
  finalDiagnosis: z.string().nullish(),
  severity: z.string().nullish(),
  icdVetCode: z.string().nullish(),
  examFeeApplied: z.number().nullish(),
  // M17 — in-clinic checkup fee (رسوم الكشف) + follow-up origin (PRD §18.7/§18.8).
  checkupFeeApplied: z.number().nullish(),
  followUpOfVisitId: z.string().nullish(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type VisitResponse = z.infer<typeof VisitResponseSchema>;

/**
 * Create payload (POST /visits). Mirrors the backend `VisitCreateRequest` + validators: `visitType`
 * ∈ VisitType; `customerId`/`doctorId` required; a visit can only be *created* `open` or
 * `in_progress` (never closed); vitals are ≥ 0. The wrapper mints the client GUID v7 `id`;
 * `visitNumber` is intentionally not collected (server stores null). If `petId` is given it must
 * belong to `customerId` (server enforces — 409 `pet_customer_mismatch`).
 */
export const VisitCreateRequestSchema = z.object({
  visitType: z.enum(["in_clinic", "field"]),
  customerId: z.string().min(1),
  petId: z.string().optional(),
  doctorId: z.string().min(1),
  receptionistId: z.string().optional(),
  status: z.enum(["open", "in_progress"]).optional(),
  chiefComplaint: optionalText,
  symptoms: optionalText,
  temperature: z.number().nonnegative().optional(),
  heartRate: z.number().int().nonnegative().optional(),
  respiratoryRate: z.number().int().nonnegative().optional(),
  weight: z.number().nonnegative().optional(),
  clinicalNotes: optionalText,
  preliminaryDiagnosis: optionalText,
  finalDiagnosis: optionalText,
  severity: z.enum(["mild", "moderate", "severe", "critical"]).optional(),
  icdVetCode: optionalText,
  examFeeApplied: z.number().nonnegative().optional(),
  // M17 — omit checkupFeeApplied to let an in-clinic visit auto-apply the settings default.
  checkupFeeApplied: z.number().nonnegative().optional(),
  followUpOfVisitId: z.string().optional(),
});
export type VisitCreateRequest = z.infer<typeof VisitCreateRequestSchema>;

/**
 * Section-level update (PATCH /visits/{id}). Every field optional — only supplied ones change.
 * `status` may advance the visit (`open → in_progress`) but cannot close it: terminal transitions
 * go through POST /visits/{id}/complete | /cancel. Editing a `completed`/`cancelled` visit is
 * rejected server-side (409 `visit_locked`).
 */
export const VisitPatchRequestSchema = z.object({
  status: z.enum(["open", "in_progress"]).optional(),
  chiefComplaint: optionalText,
  symptoms: optionalText,
  temperature: z.number().nonnegative().optional(),
  heartRate: z.number().int().nonnegative().optional(),
  respiratoryRate: z.number().int().nonnegative().optional(),
  weight: z.number().nonnegative().optional(),
  clinicalNotes: optionalText,
  preliminaryDiagnosis: optionalText,
  finalDiagnosis: optionalText,
  severity: z.enum(["mild", "moderate", "severe", "critical"]).optional(),
  icdVetCode: optionalText,
  examFeeApplied: z.number().nonnegative().optional(),
  checkupFeeApplied: z.number().nonnegative().optional(),
});
export type VisitPatchRequest = z.infer<typeof VisitPatchRequestSchema>;

/** Query params for the visits list — offset-paged; ordered by `startedAt DESC` server-side. */
export interface VisitListParams {
  customerId?: string;
  petId?: string;
  doctorId?: string;
  status?: string;
  skip?: number;
  take?: number;
}
