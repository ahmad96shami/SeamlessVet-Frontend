import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { formatDate } from "@vet/shared";

import { Edit, Paper } from "@/components/icons";
import { Card, Money, Pill } from "@/components/ui";
import { ContractBatchesSection } from "@/components/contract/ContractBatchesSection";
import { ContractMedicationPricesSection } from "@/components/contract/ContractMedicationPricesSection";
import { ScreenShell, TopBar } from "@/components/layout";
import { useQuery } from "@/sync/hooks";
import type { ContractRow, CustomerRow } from "@/sync/types";

const STATUS_TONE: Record<string, "teal" | "amber" | "green" | "red" | "neutral"> = {
  draft: "amber",
  active: "green",
  completed: "neutral",
  cancelled: "red",
};

/**
 * Contract detail (Mo5.1). A read view of the contract's terms plus, for a `draft`, the editor
 * entry (the pencil) — drafts are device-authoritative offline. The medication-price editor
 * (Mo5.2), the read-only batches view (Mo5.3), and the activation/lifecycle actions (Mo5.4) mount
 * below as their milestones land.
 */
export default function ContractDetailScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: contracts } = useQuery<ContractRow>(`SELECT * FROM contracts WHERE id = ?`, [id ?? ""]);
  const contract = contracts?.[0];

  const { data: customers } = useQuery<CustomerRow>(
    `SELECT * FROM customers WHERE id = ?`,
    [contract?.customer_id ?? ""],
  );
  const customer = customers?.[0];

  if (!contract) {
    return (
      <ScreenShell
        header={<TopBar title={t("nav.contracts")} onBack={() => router.back()} right={null} />}
      >
        <View className="items-center pt-12">
          <Text className="text-ink-500 text-[14px] font-tajawal">{t("finance.contracts.empty")}</Text>
        </View>
      </ScreenShell>
    );
  }

  const isDraft = contract.status === "draft";
  const lang = i18n.resolvedLanguage;

  return (
    <ScreenShell
      header={
        <TopBar
          title={customer?.full_name ?? t("nav.contracts")}
          onBack={() => router.back()}
          right={
            isDraft ? (
              <Pressable
                onPress={() => router.push({ pathname: "/contracts/[id]/edit", params: { id: contract.id } })}
                accessibilityRole="button"
                className="h-9 w-9 items-center justify-center"
              >
                <Edit size={20} color="#223D69" />
              </Pressable>
            ) : null
          }
        />
      }
    >
      <Card className="flex-row items-center gap-3 p-4">
        <View className="bg-teal-50 h-14 w-14 items-center justify-center rounded-card">
          <Paper size={22} color="#0F7A8A" />
        </View>
        <View className="flex-1 gap-1.5">
          <Text className="text-navy-900 text-[17px] font-tajawal-extrabold" numberOfLines={1}>
            {customer?.full_name ?? "—"}
          </Text>
          <View className="flex-row flex-wrap gap-1.5">
            <Pill tone={STATUS_TONE[contract.status] ?? "neutral"} label={t(`contractStatus.${contract.status}`)} />
            {contract.period_start ? (
              <Pill tone="neutral" label={formatDate(contract.period_start, lang)} />
            ) : null}
          </View>
        </View>
      </Card>

      <View className="mt-4 gap-3">
        <Text className="text-navy-900 text-[15px] font-tajawal-extrabold">
          {t("finance.contracts.title")}
        </Text>
        <Card className="gap-3 p-4">
          <InfoRow label={t("finance.contracts.periodStart")} value={contract.period_start ? formatDate(contract.period_start, lang) : "—"} />
          <InfoRow label={t("finance.contracts.periodEnd")} value={contract.period_end ? formatDate(contract.period_end, lang) : "—"} />
          <View className="flex-row items-center justify-between">
            <Text className="text-ink-500 text-[13px] font-tajawal">{t("finance.contracts.totalPrice")}</Text>
            {contract.total_price != null ? (
              <Money value={contract.total_price} className="text-[14px]" />
            ) : (
              <Text className="text-ink-700 text-[14px] font-tajawal-bold">—</Text>
            )}
          </View>
          <InfoRow
            label={t("finance.contracts.expectedVisitCount")}
            value={contract.expected_visit_count != null ? String(contract.expected_visit_count) : "—"}
          />
          <InfoRow label={t("finance.contracts.animalType")} value={contract.animal_type ?? "—"} />
          <InfoRow
            label={t("finance.contracts.animalCount")}
            value={contract.animal_count != null ? String(contract.animal_count) : "—"}
          />
        </Card>
      </View>

      <ContractMedicationPricesSection contractId={contract.id} isDraft={isDraft} />

      <ContractBatchesSection contractId={contract.id} />
    </ScreenShell>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-ink-500 text-[13px] font-tajawal">{label}</Text>
      <Text className="text-navy-900 text-[14px] font-tajawal-bold" numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}
