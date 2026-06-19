import { useTranslation } from "react-i18next";

import { useAuthStore } from "@/stores/authStore";

/**
 * The active center's display name for printed-document headers (receipts, invoices, statements,
 * certificates…). Sourced from the center the user signed into — manager-editable in Settings —
 * and falls back to the app name when unknown (e.g. a token-injected dev session).
 */
export function useCenterName(): string {
  const { t } = useTranslation();
  const centerName = useAuthStore((s) => s.centerName);
  return centerName?.trim() ? centerName : t("appName");
}
