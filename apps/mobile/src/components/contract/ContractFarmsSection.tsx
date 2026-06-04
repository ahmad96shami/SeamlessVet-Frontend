import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { Add, Cow, Trash } from "@/components/icons";
import { Card, Pill } from "@/components/ui";
import { dialog } from "@/stores/dialogStore";
import { useQuery } from "@/sync/hooks";
import { syncDelete } from "@/sync/writes";
import type { ContractFarmRow } from "@/sync/types";
import { colors } from "@/theme";

interface Props {
  contractId: string;
  /** Coverage is editable only while the parent contract is a draft (mirrors med-prices). */
  isDraft: boolean;
}

interface RowWithFarm extends ContractFarmRow {
  farm_name: string | null;
  farm_kind: string | null;
}

/**
 * Which of the customer's farms this contract covers (M15 `contract_farms` — Mo8.3). Reads the
 * join rows + farm names from local SQLite; attach/detach are draft-only `/sync/contract_farms`
 * writes (offline-capable, the same device-authoritative draft rule as the med-price overrides).
 * A non-draft contract shows the coverage read-only with the draft-only notice.
 */
export function ContractFarmsSection({ contractId, isDraft }: Props) {
  const router = useRouter();
  const { t } = useTranslation();

  const { data } = useQuery<RowWithFarm>(
    `SELECT cf.*, f.name AS farm_name, f.kind AS farm_kind
       FROM contract_farms cf
       LEFT JOIN farms f ON f.id = cf.farm_id
       WHERE cf.contract_id = ?
       ORDER BY f.name`,
    [contractId],
  );
  const rows = data ?? [];

  const confirmRemove = (row: RowWithFarm) => {
    void dialog
      .confirm({
        title: t("finance.contractFarms.title"),
        message: t("finance.contractFarms.removeConfirm"),
        confirmLabel: t("actions.delete"),
        destructive: true,
      })
      .then((ok) => {
        if (ok) void syncDelete("contract_farms", row.id);
      });
  };

  return (
    <View className="mt-4 gap-3">
      <View className="flex-row items-center justify-between">
        <Text className="text-navy-900 text-[15px] font-tajawal-extrabold">
          {t("finance.contractFarms.title")}
        </Text>
        {isDraft ? (
          <Pressable
            onPress={() =>
              router.push({ pathname: "/contracts/[id]/farms/new", params: { id: contractId } })
            }
            className="bg-navy-900 active:bg-navy-800 flex-row items-center gap-1.5 rounded-pill px-3 py-1.5"
          >
            <Add size={14} color={colors.white} />
            <Text className="text-paper text-[12px] font-tajawal-bold">
              {t("finance.contractFarms.add")}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <Text className="text-ink-500 text-[12px] font-tajawal">
        {isDraft
          ? t("finance.contractFarms.subtitle")
          : t("finance.contractFarms.draftOnly")}
      </Text>

      {rows.length === 0 ? (
        <Card flat className="p-4">
          <Text className="text-ink-500 text-center text-[13px] font-tajawal">
            {t("finance.contractFarms.empty")}
          </Text>
        </Card>
      ) : (
        rows.map((row) => (
          <Card key={row.id} className="flex-row items-center gap-3 p-3">
            <View className="bg-teal-50 h-10 w-10 items-center justify-center rounded-card">
              <Cow size={18} color={colors.teal[600]} />
            </View>
            <View className="flex-1 gap-1">
              <Text className="text-navy-900 text-[14px] font-tajawal-extrabold" numberOfLines={1}>
                {row.farm_name ?? "—"}
              </Text>
              {row.farm_kind ? (
                <View className="flex-row">
                  <Pill tone="teal" label={t(`farmKind.${row.farm_kind}`)} />
                </View>
              ) : null}
            </View>
            {isDraft ? (
              <Pressable
                onPress={() => confirmRemove(row)}
                accessibilityRole="button"
                className="h-9 w-9 items-center justify-center"
              >
                <Trash size={18} color={colors.rose.ink} />
              </Pressable>
            ) : null}
          </Card>
        ))
      )}
    </View>
  );
}
