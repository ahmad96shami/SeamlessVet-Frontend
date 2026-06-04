import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { formatCurrency, formatDate } from "@vet/shared";

import { Box } from "@/components/icons";
import { Card, Pill } from "@/components/ui";
import { useQuery } from "@/sync/hooks";
import type { BatchRow } from "@/sync/types";
import { colors } from "@/theme";

interface Props {
  contractId: string;
}

const STATUS_TONE: Record<string, "green" | "neutral"> = {
  open: "green",
  closed: "neutral",
};

/**
 * Read-only view of the supervision batches under a contract (Mo5.3). Batches are
 * server-authoritative — created and configured on the web (`/sync/batches` is read-only on the
 * device, 405 on any write), so this section never offers add/edit; it just reflects what synced
 * down. Closing a batch (web) computes the doctor's entitlement (M9). Reads from local SQLite,
 * scoped to this contract.
 */
export function ContractBatchesSection({ contractId }: Props) {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage;

  const { data } = useQuery<BatchRow>(
    `SELECT * FROM batches WHERE contract_id = ? ORDER BY COALESCE(updated_at, created_at, start_date) DESC`,
    [contractId],
  );
  const rows = data ?? [];

  return (
    <View className="mt-4 gap-3">
      <Text className="text-navy-900 text-[15px] font-tajawal-extrabold">
        {t("finance.batches.title")}
      </Text>
      <Text className="text-ink-500 text-[12px] font-tajawal">{t("finance.batches.readOnlyHint")}</Text>

      {rows.length === 0 ? (
        <Card flat className="p-4">
          <Text className="text-ink-500 text-center text-[13px] font-tajawal">
            {t("finance.batches.empty")}
          </Text>
        </Card>
      ) : (
        rows.map((b) => {
          const feeValue =
            b.supervision_fee_model === "percent_of_invoice"
              ? `${b.supervision_fee_value}%`
              : formatCurrency(b.supervision_fee_value, lang);
          return (
            <Card key={b.id} className="gap-2 p-3">
              <View className="flex-row items-center justify-between gap-2">
                <View className="flex-row items-center gap-2">
                  <View className="bg-teal-50 h-9 w-9 items-center justify-center rounded-card">
                    <Box size={16} color={colors.teal[600]} />
                  </View>
                  <Pill tone={STATUS_TONE[b.status] ?? "neutral"} label={t(`batchStatus.${b.status}`)} />
                </View>
                <Text className="text-ink-500 text-[12px] font-tajawal" numberOfLines={1}>
                  {formatDate(b.start_date, lang)}
                  {b.end_date ? ` — ${formatDate(b.end_date, lang)}` : ""}
                </Text>
              </View>
              <View className="flex-row flex-wrap gap-1.5">
                <Pill tone="neutral" label={`${t("finance.batches.animalCount")}: ${b.animal_count}`} />
                <Pill tone="neutral" label={`${t(`feeModel.${b.supervision_fee_model}`)}: ${feeValue}`} />
                {b.doctor_share_percent != null ? (
                  <Pill tone="teal" label={`${t("finance.batches.colShare")}: ${b.doctor_share_percent}%`} />
                ) : null}
                {b.entitlement_system ? (
                  <Pill tone="neutral" label={t(`entitlementSystem.${b.entitlement_system}`)} />
                ) : null}
              </View>
            </Card>
          );
        })
      )}
    </View>
  );
}
