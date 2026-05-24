import { z } from "zod";

/**
 * The per-environment `system_settings` singleton (GET /admin/settings, PRD §5.7). Every
 * admin-tunable value surfaces here so the Admin UI can change it without a redeploy.
 */
export const SystemSettingsResponseSchema = z.object({
  id: z.string(),
  defaultExamFee: z.number(),
  entitlementEnabledGlobal: z.boolean(),
  lowStockThresholdPct: z.number(),
  expirationWarningDays: z.number().int(),
  taxEnabled: z.boolean(),
  taxRate: z.number(),
  logoUrl: z.string().nullish(),
  invoiceTaxDetails: z.string().nullish(),
  extra: z.string().nullish(),
  updatedAt: z.string(),
});
export type SystemSettingsResponse = z.infer<typeof SystemSettingsResponseSchema>;

/**
 * PATCH /admin/settings — every field optional; only supplied fields change. Nullable text
 * fields accept `null` to clear them (the form sends `null` for an emptied input).
 */
export const SystemSettingsPatchRequestSchema = z.object({
  defaultExamFee: z.number().min(0).optional(),
  entitlementEnabledGlobal: z.boolean().optional(),
  lowStockThresholdPct: z.number().min(0).optional(),
  expirationWarningDays: z.number().int().min(0).optional(),
  taxEnabled: z.boolean().optional(),
  taxRate: z.number().min(0).optional(),
  logoUrl: z.string().nullable().optional(),
  invoiceTaxDetails: z.string().nullable().optional(),
  extra: z.string().nullable().optional(),
});
export type SystemSettingsPatchRequest = z.infer<typeof SystemSettingsPatchRequestSchema>;
