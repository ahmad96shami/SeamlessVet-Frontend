import { z } from "zod";

/**
 * The per-environment `system_settings` singleton (GET /admin/settings, PRD §5.7). Every
 * admin-tunable value surfaces here so the Admin UI can change it without a redeploy.
 */
export const SystemSettingsResponseSchema = z.object({
  id: z.string(),
  defaultExamFee: z.number(),
  // M17 — in-clinic checkup fee default (رسوم الكشف, PRD §18.7).
  defaultCheckupFee: z.number(),
  entitlementEnabledGlobal: z.boolean(),
  lowStockThresholdPct: z.number(),
  expirationWarningDays: z.number().int(),
  taxEnabled: z.boolean(),
  taxRate: z.number(),
  logoUrl: z.string().nullish(),
  invoiceTaxDetails: z.string().nullish(),
  extra: z.string().nullish(),
  // M17 — night-stay per-night rates + checkout hour (مبيت, PRD §18.6), surfaced from `extra`.
  nightStayRateMedical: z.number(),
  nightStayRateIcu: z.number(),
  nightStayRateHotel: z.number(),
  nightStayCheckoutHour: z.number().int(),
  updatedAt: z.string(),
});
export type SystemSettingsResponse = z.infer<typeof SystemSettingsResponseSchema>;

/**
 * PATCH /admin/settings — every field optional; only supplied fields change. Nullable text
 * fields accept `null` to clear them (the form sends `null` for an emptied input).
 */
export const SystemSettingsPatchRequestSchema = z.object({
  defaultExamFee: z.number().min(0).optional(),
  defaultCheckupFee: z.number().min(0).optional(),
  entitlementEnabledGlobal: z.boolean().optional(),
  lowStockThresholdPct: z.number().min(0).optional(),
  expirationWarningDays: z.number().int().min(0).optional(),
  taxEnabled: z.boolean().optional(),
  taxRate: z.number().min(0).optional(),
  logoUrl: z.string().nullable().optional(),
  invoiceTaxDetails: z.string().nullable().optional(),
  extra: z.string().nullable().optional(),
  // M17 — merged into `extra.nightStay` server-side (other extra keys preserved).
  nightStayRateMedical: z.number().min(0).optional(),
  nightStayRateIcu: z.number().min(0).optional(),
  nightStayRateHotel: z.number().min(0).optional(),
  nightStayCheckoutHour: z.number().int().min(0).max(23).optional(),
});
export type SystemSettingsPatchRequest = z.infer<typeof SystemSettingsPatchRequestSchema>;
