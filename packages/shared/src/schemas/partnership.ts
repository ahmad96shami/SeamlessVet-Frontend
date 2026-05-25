import { z } from "zod";

import { optionalText } from "./common";

// ---- Partners (M10) -------------------------------------------------------

/**
 * A clinic partner (GET /partners[/{id}], PRD §6.8). Admin-only Center-Web data, available **only in a
 * `partnership` environment** — the endpoints 404 in a `solo` one (the web hides the surface then).
 * `userId` optionally links the partner to a system user. Not on the sync path.
 */
export const PartnerResponseSchema = z.object({
  id: z.string(),
  userId: z.string().nullish(),
  displayName: z.string(),
  notes: z.string().nullish(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type PartnerResponse = z.infer<typeof PartnerResponseSchema>;

/** Create (POST /partners). `displayName` required (≤256). The wrapper mints the client GUID v7 `id`. */
export const PartnerCreateRequestSchema = z.object({
  userId: z.string().optional(),
  displayName: z.string().trim().min(1).max(256),
  notes: optionalText,
});
export type PartnerCreateRequest = z.infer<typeof PartnerCreateRequestSchema>;

/** Partner edit (PATCH /partners/{id}). Every field optional; `userId` cannot be cleared via PATCH. */
export const PartnerPatchRequestSchema = z.object({
  userId: z.string().optional(),
  displayName: z.string().trim().min(1).max(256).optional(),
  notes: optionalText,
});
export type PartnerPatchRequest = z.infer<typeof PartnerPatchRequestSchema>;

/** Query params for the partners list — offset-paged. */
export interface PartnerListParams {
  skip?: number;
  take?: number;
}

// ---- Partnership shares (M10) ---------------------------------------------

/**
 * A partner's profit share over an effective window (GET /partnership-shares[/{id}], PRD §6.8). A share
 * is active on date D when `effectiveFrom ≤ D && (effectiveTo is null || effectiveTo ≥ D)` (inclusive
 * both ends). Per environment, **active shares may not sum to more than 100% on any date** — enforced
 * server-side; create/update return 409 `partnership_share_exceeded` when violated. `sharePercent` is a
 * 0–100 percentage. Date fields are `yyyy-MM-dd`.
 */
export const PartnershipShareResponseSchema = z.object({
  id: z.string(),
  partnerId: z.string(),
  sharePercent: z.number(),
  effectiveFrom: z.string(),
  effectiveTo: z.string().nullish(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type PartnershipShareResponse = z.infer<typeof PartnershipShareResponseSchema>;

/** Create (POST /partnership-shares). The wrapper mints the client GUID v7 `id`. */
export const PartnershipShareCreateRequestSchema = z.object({
  partnerId: z.string().min(1),
  sharePercent: z.number().min(0).max(100),
  effectiveFrom: z.string().min(1),
  effectiveTo: z.string().optional(),
});
export type PartnershipShareCreateRequest = z.infer<typeof PartnershipShareCreateRequestSchema>;

/**
 * Share edit (PATCH /partnership-shares/{id}). Every field optional; re-validates the ≤100% invariant.
 * Note: `effectiveTo` can be set via PATCH but not reverted to open-ended (null) — recreate the share.
 */
export const PartnershipSharePatchRequestSchema = z.object({
  sharePercent: z.number().min(0).max(100).optional(),
  effectiveFrom: z.string().min(1).optional(),
  effectiveTo: z.string().optional(),
});
export type PartnershipSharePatchRequest = z.infer<typeof PartnershipSharePatchRequestSchema>;

/** Query params for the shares list — offset-paged; `activeOn` is a `yyyy-MM-dd` filter. */
export interface PartnershipShareListParams {
  partnerId?: string;
  activeOn?: string;
  skip?: number;
  take?: number;
}
