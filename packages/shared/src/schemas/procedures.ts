import { z } from "zod";

import { optionalText } from "./common";

/**
 * A procedure performed during a visit (PRD §5.2-C). Linked to a catalog `serviceId`; `price` is
 * snapshotted at create time (defaults to the service's `default_price` if omitted). The DB requires
 * at least one of `resultText` / `resultFileUrl` — the form supplies a result text.
 */
export const ProcedureResponseSchema = z.object({
  id: z.string(),
  visitId: z.string(),
  serviceId: z.string().nullish(),
  resultText: z.string().nullish(),
  resultFileUrl: z.string().nullish(),
  price: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ProcedureResponse = z.infer<typeof ProcedureResponseSchema>;

/** Create payload (POST /procedures). The wrapper mints the client GUID v7 `id`. */
export const ProcedureCreateRequestSchema = z.object({
  visitId: z.string().min(1),
  serviceId: z.string().optional(),
  resultText: optionalText,
  resultFileUrl: optionalText,
  price: z.number().nonnegative().optional(),
});
export type ProcedureCreateRequest = z.infer<typeof ProcedureCreateRequestSchema>;

/** Partial update (PATCH /procedures/{id}). */
export const ProcedurePatchRequestSchema = z.object({
  serviceId: z.string().optional(),
  resultText: optionalText,
  resultFileUrl: optionalText,
  price: z.number().nonnegative().optional(),
});
export type ProcedurePatchRequest = z.infer<typeof ProcedurePatchRequestSchema>;

export interface ProcedureListParams {
  visitId?: string;
  skip?: number;
  take?: number;
}
